#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node ua-tour-analyze.cjs <input.json> <output.json>');
  process.exit(1);
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = input.nodes || [];
  const edges = input.edges || [];
  const layers = input.layers || [];

  // Build adjacency lists for imports and calls edges (forward direction)
  const importsAdj = {};
  const callsAdj = {};
  const allAdj = {};

  nodes.forEach(node => {
    importsAdj[node.id] = [];
    callsAdj[node.id] = [];
    allAdj[node.id] = [];
  });

  edges.forEach(edge => {
    if (edge.direction === 'forward' || edge.direction === 'bidirectional') {
      if (edge.type === 'imports' && importsAdj[edge.source]) {
        importsAdj[edge.source].push(edge.target);
      }
      if (edge.type === 'calls' && callsAdj[edge.source]) {
        callsAdj[edge.source].push(edge.target);
      }
      if (allAdj[edge.source]) {
        allAdj[edge.source].push(edge.target);
      }
    }
    if (edge.direction === 'backward' || edge.direction === 'bidirectional') {
      if (allAdj[edge.target]) {
        allAdj[edge.target].push(edge.source);
      }
    }
  });

  // A. Fan-In Ranking
  const fanIn = {};
  nodes.forEach(node => { fanIn[node.id] = 0; });
  edges.forEach(edge => {
    if (fanIn[edge.target] !== undefined) {
      fanIn[edge.target]++;
    }
  });
  const fanInRanking = Object.entries(fanIn)
    .map(([id, fanIn]) => ({ id, fanIn, name: nodes.find(n => n.id === id)?.name || id }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);

  // B. Fan-Out Ranking
  const fanOut = {};
  nodes.forEach(node => { fanOut[node.id] = 0; });
  edges.forEach(edge => {
    if (fanOut[edge.source] !== undefined) {
      fanOut[edge.source]++;
    }
  });
  const fanOutRanking = Object.entries(fanOut)
    .map(([id, fanOut]) => ({ id, fanOut, name: nodes.find(n => n.id === id)?.name || id }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  // C. Entry Point Candidates
  const entryPointScores = {};
  nodes.forEach(node => { entryPointScores[node.id] = 0; });

  // Filename patterns for entry points
  const entryPointFilenames = [
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js',
    'server.ts', 'server.js', 'mod.rs', 'main.go', 'main.py', 'main.rs',
    'manage.py', 'app.py', 'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
    'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php',
    'App.swift', 'Application.kt', 'main.cpp', 'main.c'
  ];

  nodes.forEach(node => {
    const filePath = node.filePath || '';
    const fileName = path.basename(filePath);
    
    // Code file signals
    if (node.type === 'file' || node.type === 'config' || node.type === 'service' || 
        node.type === 'pipeline' || node.type === 'table' || node.type === 'schema' || 
        node.type === 'resource' || node.type === 'endpoint') {
      if (entryPointFilenames.includes(fileName)) {
        entryPointScores[node.id] += 3;
      }
      // At project root or one level deep
      if (!filePath.includes('/') || filePath.split('/').length <= 2) {
        entryPointScores[node.id] += 1;
      }
      // High fan-out (top 10%)
      const fanOutVal = fanOut[node.id] || 0;
      const fanOutThreshold = fanOutRanking.length > 0 ? fanOutRanking[Math.floor(fanOutRanking.length * 0.1)]?.fanOut || 0 : 0;
      if (fanOutVal >= fanOutThreshold && fanOutVal > 0) {
        entryPointScores[node.id] += 1;
      }
      // Low fan-in (bottom 25%)
      const fanInVal = fanIn[node.id] || 0;
      const fanInSorted = Object.entries(fanIn).sort((a, b) => a[1] - b[1]);
      const fanInThreshold = fanInSorted[Math.floor(fanInSorted.length * 0.25)]?.[1] || 0;
      if (fanInVal <= fanInThreshold) {
        entryPointScores[node.id] += 1;
      }
    }
    
    // Documentation signals
    if (node.type === 'document') {
      if (fileName === 'README.md' && !filePath.includes('/')) {
        entryPointScores[node.id] += 5;
      } else if (fileName.endsWith('.md') && !filePath.includes('/')) {
        entryPointScores[node.id] += 2;
      }
    }
  });

  const entryPointCandidates = Object.entries(entryPointScores)
    .map(([id, score]) => ({ 
      id, 
      score, 
      name: nodes.find(n => n.id === id)?.name || id,
      summary: nodes.find(n => n.id === id)?.summary || ''
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // D. Dependency Chains (BFS from top code entry point)
  // Find top code entry point (not documentation)
  const codeEntryPoints = entryPointCandidates.filter(c => 
    c.id.startsWith('file:') || c.id.startsWith('config:') || 
    c.id.startsWith('service:') || c.id.startsWith('pipeline:') ||
    c.id.startsWith('table:') || c.id.startsWith('schema:') ||
    c.id.startsWith('resource:') || c.id.startsWith('endpoint:')
  );
  const startNode = codeEntryPoints.length > 0 ? codeEntryPoints[0].id : nodes[0]?.id;

  const bfsTraversal = { order: [], depthMap: {}, byDepth: {} };
  if (startNode) {
    const visited = new Set();
    const queue = [{ node: startNode, depth: 0 }];
    visited.add(startNode);

    while (queue.length > 0) {
      const { node, depth } = queue.shift();
      bfsTraversal.order.push(node);
      bfsTraversal.depthMap[node] = depth;
      if (!bfsTraversal.byDepth[depth]) bfsTraversal.byDepth[depth] = [];
      bfsTraversal.byDepth[depth].push(node);

      // Follow imports and calls edges
      const neighbors = [...(importsAdj[node] || []), ...(callsAdj[node] || [])];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, depth: depth + 1 });
        }
      });
    }
    bfsTraversal.startNode = startNode;
  }

  // E. Non-Code File Inventory
  const nonCodeFiles = {
    documentation: [],
    infrastructure: [],
    data: [],
    config: []
  };

  nodes.forEach(node => {
    const info = { id: node.id, name: node.name, type: node.type, summary: node.summary || '' };
    if (node.type === 'document') {
      nonCodeFiles.documentation.push(info);
    } else if (['service', 'pipeline', 'resource'].includes(node.type)) {
      nonCodeFiles.infrastructure.push(info);
    } else if (['table', 'schema', 'endpoint'].includes(node.type)) {
      nonCodeFiles.data.push(info);
    } else if (node.type === 'config') {
      nonCodeFiles.config.push(info);
    }
  });

  // F. Tightly Coupled Clusters
  const clusters = [];
  const bidirectionalPairs = new Set();
  edges.forEach(edge => {
    if (edge.direction === 'bidirectional' || edge.direction === 'forward') {
      // Check for reverse edge
      const hasReverse = edges.some(e => 
        e.source === edge.target && e.target === edge.source && 
        (e.direction === 'bidirectional' || e.direction === 'forward')
      );
      if (hasReverse) {
        const pair = [edge.source, edge.target].sort().join('|');
        bidirectionalPairs.add(pair);
      }
    }
  });

  // Group bidirectional pairs into clusters
  const clusterMap = new Map();
  bidirectionalPairs.forEach(pair => {
    const [a, b] = pair.split('|');
    let foundCluster = null;
    for (const [clusterId, clusterNodes] of clusterMap) {
      if (clusterNodes.has(a) || clusterNodes.has(b)) {
        foundCluster = clusterId;
        break;
      }
    }
    if (foundCluster) {
      clusterMap.get(foundCluster).add(a);
      clusterMap.get(foundCluster).add(b);
    } else {
      const newSet = new Set([a, b]);
      clusterMap.set(`cluster_${clusterMap.size}`, newSet);
    }
  });

  // Expand clusters
  clusters.push(...Array.from(clusterMap.values())
    .map(nodes => Array.from(nodes))
    .filter(nodes => nodes.length >= 2 && nodes.length <= 5)
    .slice(0, 10));

  // G. Layer List
  const layerList = layers.map(l => ({ id: l.id, name: l.name, description: l.description }));

  // H. Node Summary Index
  const nodeSummaryIndex = {};
  nodes.forEach(node => {
    nodeSummaryIndex[node.id] = {
      name: node.name,
      type: node.type,
      summary: node.summary || ''
    };
  });

  const output = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal,
    nonCodeFiles,
    clusters,
    layers: { count: layers.length, list: layerList },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}