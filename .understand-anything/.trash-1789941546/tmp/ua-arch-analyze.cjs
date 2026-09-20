#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
  process.exit(1);
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const fileNodes = input.fileNodes || [];
  const importEdges = input.importEdges || [];
  const allEdges = input.allEdges || [];

  // Helper: get common prefix of all file paths
  function getCommonPrefix(paths) {
    if (paths.length === 0) return '';
    let prefix = paths[0];
    for (let i = 1; i < paths.length; i++) {
      let j = 0;
      while (j < prefix.length && j < paths[i].length && prefix[j] === paths[i][j]) {
        j++;
      }
      prefix = prefix.substring(0, j);
      // Trim to last slash
      const lastSlash = prefix.lastIndexOf('/');
      if (lastSlash !== -1) {
        prefix = prefix.substring(0, lastSlash + 1);
      } else {
        prefix = '';
      }
    }
    return prefix;
  }

  // Better grouping: find the common root for code files (typically src/)
  function getCodeRootPrefix(paths) {
    const codePaths = paths.filter(p => p.startsWith('src/'));
    if (codePaths.length === 0) return getCommonPrefix(paths);
    return getCommonPrefix(codePaths);
  }

  // Extract file paths from node IDs
  function getFilePath(nodeId) {
    if (nodeId.startsWith('file:')) return nodeId.substring(5);
    if (nodeId.startsWith('config:')) return nodeId.substring(7);
    if (nodeId.startsWith('document:')) return nodeId.substring(9);
    if (nodeId.startsWith('service:')) return nodeId.substring(8);
    if (nodeId.startsWith('pipeline:')) return nodeId.substring(9);
    if (nodeId.startsWith('table:')) return nodeId.substring(6);
    if (nodeId.startsWith('schema:')) return nodeId.substring(7);
    if (nodeId.startsWith('resource:')) return nodeId.substring(9);
    if (nodeId.startsWith('endpoint:')) return nodeId.substring(9);
    return nodeId;
  }

  // A. Directory Grouping
  const filePaths = fileNodes.map(n => getFilePath(n.id));
  const commonPrefix = getCommonPrefix(filePaths);
  const codeRootPrefix = getCodeRootPrefix(filePaths);

  const directoryGroups = {};
  fileNodes.forEach(node => {
    const filePath = getFilePath(node.id);
    let group = 'root';
    
    // For code files under src/, use the subdirectory structure
    if (filePath.startsWith(codeRootPrefix) && codeRootPrefix !== commonPrefix) {
      const relative = filePath.substring(codeRootPrefix.length);
      const firstSegment = relative.split('/')[0];
      if (firstSegment) group = firstSegment;
      else group = 'src-root';
    } else if (filePath.startsWith(commonPrefix)) {
      const relative = filePath.substring(commonPrefix.length);
      const firstSegment = relative.split('/')[0];
      if (firstSegment) group = firstSegment;
    } else {
      const firstSegment = filePath.split('/')[0];
      if (firstSegment) group = firstSegment;
    }
    if (!directoryGroups[group]) directoryGroups[group] = [];
    directoryGroups[group].push(node.id);
  });

  // B. Node Type Grouping
  const nodeTypeGroups = {};
  fileNodes.forEach(node => {
    if (!nodeTypeGroups[node.type]) nodeTypeGroups[node.type] = [];
    nodeTypeGroups[node.type].push(node.id);
  });

  // C. Import Adjacency Matrix
  const adjacency = {};
  const fanIn = {};
  const fanOut = {};

  fileNodes.forEach(node => {
    adjacency[node.id] = { imports: [], importedBy: [] };
    fanIn[node.id] = 0;
    fanOut[node.id] = 0;
  });

  importEdges.forEach(edge => {
    if (adjacency[edge.source] && adjacency[edge.target]) {
      adjacency[edge.source].imports.push(edge.target);
      adjacency[edge.target].importedBy.push(edge.source);
      fanOut[edge.source]++;
      fanIn[edge.target]++;
    }
  });

  // D. Cross-Category Dependency Analysis
  const crossCategoryEdges = {};
  allEdges.forEach(edge => {
    const sourceNode = fileNodes.find(n => n.id === edge.source);
    const targetNode = fileNodes.find(n => n.id === edge.target);
    if (sourceNode && targetNode) {
      const key = `${sourceNode.type} -> ${targetNode.type}: ${edge.type}`;
      crossCategoryEdges[key] = (crossCategoryEdges[key] || 0) + 1;
    }
  });
  const crossCategoryEdgesArray = Object.entries(crossCategoryEdges).map(([key, count]) => {
    const [types, edgeType] = key.split(': ');
    const [fromType, toType] = types.split(' -> ');
    return { fromType, toType, edgeType, count };
  });

  // E. Inter-Group Import Frequency
  const groupOfNode = {};
  Object.entries(directoryGroups).forEach(([group, nodes]) => {
    nodes.forEach(nodeId => { groupOfNode[nodeId] = group; });
  });

  const interGroupImports = {};
  importEdges.forEach(edge => {
    const fromGroup = groupOfNode[edge.source];
    const toGroup = groupOfNode[edge.target];
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = `${fromGroup} -> ${toGroup}`;
      interGroupImports[key] = (interGroupImports[key] || 0) + 1;
    }
  });
  const interGroupImportsArray = Object.entries(interGroupImports).map(([key, count]) => {
    const [from, to] = key.split(' -> ');
    return { from, to, count };
  });

  // F. Intra-Group Import Density
  const intraGroupDensity = {};
  Object.entries(directoryGroups).forEach(([group, nodes]) => {
    let internalEdges = 0;
    let totalEdges = 0;
    nodes.forEach(nodeId => {
      const adj = adjacency[nodeId];
      if (adj) {
        adj.imports.forEach(target => {
          totalEdges++;
          if (groupOfNode[target] === group) internalEdges++;
        });
        adj.importedBy.forEach(source => {
          totalEdges++;
          if (groupOfNode[source] === group) internalEdges++;
        });
      }
    });
    // Each edge counted twice (once from source, once from target), so divide by 2
    totalEdges = Math.floor(totalEdges / 2);
    internalEdges = Math.floor(internalEdges / 2);
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges > 0 ? internalEdges / totalEdges : 0
    };
  });

  // G. Directory Pattern Matching
  const patternMatches = {};
  const patternTable = {
    'routes': 'api', 'api': 'api', 'controllers': 'api', 'endpoints': 'api', 'handlers': 'api',
    'services': 'service', 'core': 'service', 'lib': 'service', 'domain': 'service', 'logic': 'service',
    'models': 'data', 'db': 'data', 'data': 'data', 'persistence': 'data', 'repository': 'data', 'entities': 'data',
    'components': 'ui', 'views': 'ui', 'pages': 'ui', 'ui': 'ui', 'layouts': 'ui', 'screens': 'ui',
    'middleware': 'middleware', 'plugins': 'middleware', 'interceptors': 'middleware', 'guards': 'middleware',
    'utils': 'utility', 'helpers': 'utility', 'common': 'utility', 'shared': 'utility', 'tools': 'utility',
    'config': 'config', 'constants': 'config', 'env': 'config', 'settings': 'config',
    '__tests__': 'test', 'test': 'test', 'tests': 'test', 'spec': 'test', 'specs': 'test',
    'types': 'types', 'interfaces': 'types', 'schemas': 'types', 'contracts': 'types', 'dtos': 'types',
    'hooks': 'hooks',
    'store': 'state', 'state': 'state', 'reducers': 'state', 'actions': 'state', 'slices': 'state',
    'assets': 'assets', 'static': 'assets', 'public': 'assets',
    'migrations': 'data',
    'management': 'config', 'commands': 'config',
    'templatetags': 'utility',
    'signals': 'service',
    'serializers': 'api',
    'cmd': 'entry',
    'internal': 'service',
    'pkg': 'utility',
    'dto': 'types', 'request': 'types', 'response': 'types',
    'entity': 'data',
    'controller': 'api',
    'routers': 'api',
    'composables': 'service',
    'blueprints': 'api',
    'mailers': 'service', 'jobs': 'service', 'channels': 'service',
    'bin': 'entry',
    'docs': 'documentation', 'documentation': 'documentation', 'wiki': 'documentation',
    'deploy': 'infrastructure', 'deployment': 'infrastructure', 'infra': 'infrastructure', 'infrastructure': 'infrastructure',
    'docker': 'infrastructure',
    'sql': 'data', 'database': 'data', 'schema': 'data'
  };

  Object.keys(directoryGroups).forEach(group => {
    if (patternTable[group.toLowerCase()]) {
      patternMatches[group] = patternTable[group.toLowerCase()];
    }
  });

  // Also check file-level patterns
  fileNodes.forEach(node => {
    const filePath = getFilePath(node.id);
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath).split('/').pop() || '';

    // Check if already matched via directory
    if (patternMatches[dirName]) return;

    // Test files
    if (fileName.match(/\.(test|spec)\./) || fileName.match(/^test_/) || fileName.match(/_test\./) || 
        fileName.match(/Test\.(java|cs)$/) || fileName.match(/_spec\.rb$/) || fileName.match(/Tests\.cs$/)) {
      patternMatches[dirName] = 'test';
    }
    // TypeScript declaration files
    else if (fileName.endsWith('.d.ts')) {
      patternMatches[dirName] = 'types';
    }
    // Index files at package root
    else if (fileName === 'index.ts' || fileName === 'index.js' || fileName === '__init__.py') {
      patternMatches[dirName] = 'entry';
    }
    // Django manage.py
    else if (fileName === 'manage.py' && dirName === '') {
      patternMatches['root'] = 'entry';
    }
    // Python WSGI/ASGI
    else if (fileName === 'wsgi.py' || fileName === 'asgi.py') {
      patternMatches[dirName] = 'config';
    }
    // Go entry points
    else if (fileName === 'main.go' && dirName === 'cmd') {
      patternMatches[dirName] = 'entry';
    }
    // Rust entry points
    else if ((fileName === 'main.rs' || fileName === 'lib.rs') && dirName === 'src') {
      patternMatches[dirName] = 'entry';
    }
    // Java/.NET entry points
    else if (fileName === 'Application.java' || fileName === 'Program.cs') {
      patternMatches[dirName] = 'entry';
    }
    // Ruby Rack
    else if (fileName === 'config.ru') {
      patternMatches[dirName] = 'entry';
    }
    // Language-level project config
    else if (['Cargo.toml', 'go.mod', 'Gemfile', 'pom.xml', 'build.gradle', 'composer.json'].includes(fileName)) {
      patternMatches[dirName] = 'config';
    }
    // Docker
    else if (fileName === 'Dockerfile' || fileName.startsWith('docker-compose.')) {
      patternMatches[dirName] = 'infrastructure';
    }
    // Terraform
    else if (fileName.endsWith('.tf') || fileName.endsWith('.tfvars')) {
      patternMatches[dirName] = 'infrastructure';
    }
    // CI/CD
    else if (filePath.startsWith('.github/workflows/') || fileName === '.gitlab-ci.yml' || fileName === 'Jenkinsfile') {
      patternMatches[dirName] = 'ci-cd';
    }
    // SQL
    else if (fileName.endsWith('.sql')) {
      patternMatches[dirName] = 'data';
    }
    // GraphQL/Protobuf
    else if (fileName.endsWith('.graphql') || fileName.endsWith('.gql') || fileName.endsWith('.proto')) {
      patternMatches[dirName] = 'types';
    }
    // Markdown docs
    else if (fileName.endsWith('.md') || fileName.endsWith('.rst')) {
      patternMatches[dirName] = 'documentation';
    }
    // Makefile
    else if (fileName === 'Makefile') {
      patternMatches[dirName] = 'infrastructure';
    }
  });

  // H. Deployment Topology Detection
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  fileNodes.forEach(node => {
    const filePath = getFilePath(node.id);
    const fileName = path.basename(filePath);
    if (fileName === 'Dockerfile' || fileName.startsWith('Dockerfile.')) { hasDockerfile = true; infraFiles.push(filePath); }
    else if (fileName.startsWith('docker-compose.')) { hasCompose = true; infraFiles.push(filePath); }
    else if (filePath.includes('k8s/') || filePath.includes('kubernetes/') || fileName.endsWith('.k8s.yml') || fileName.endsWith('.k8s.yaml')) { hasK8s = true; infraFiles.push(filePath); }
    else if (fileName.endsWith('.tf') || fileName.endsWith('.tfvars')) { hasTerraform = true; infraFiles.push(filePath); }
    else if (filePath.startsWith('.github/workflows/') || fileName === '.gitlab-ci.yml' || fileName === 'Jenkinsfile') { hasCI = true; infraFiles.push(filePath); }
  });

  // I. Data Pipeline Detection
  const schemaFiles = [];
  const migrationFiles = [];
  const dataModelFiles = [];
  const apiHandlerFiles = [];
  fileNodes.forEach(node => {
    const filePath = getFilePath(node.id);
    const fileName = path.basename(filePath);
    if (fileName.endsWith('.sql') && !filePath.includes('migration')) {
      schemaFiles.push(filePath);
    } else if (filePath.includes('migration') && fileName.endsWith('.sql')) {
      migrationFiles.push(filePath);
    } else if (fileName.endsWith('.graphql') || fileName.endsWith('.gql') || fileName.endsWith('.proto') || fileName.endsWith('.prisma')) {
      schemaFiles.push(filePath);
    } else if (node.type === 'file' && (node.tags?.includes('api-handler') || node.tags?.includes('controller') || node.tags?.includes('endpoint'))) {
      apiHandlerFiles.push(filePath);
    } else if (node.type === 'file' && (node.tags?.includes('data-model') || node.tags?.includes('entity') || node.tags?.includes('model'))) {
      dataModelFiles.push(filePath);
    }
  });

  // J. Documentation Coverage
  const groupsWithDocs = new Set();
  const allGroups = new Set(Object.keys(directoryGroups));
  fileNodes.forEach(node => {
    const filePath = getFilePath(node.id);
    const fileName = path.basename(filePath);
    if (fileName.match(/^README\./i) || fileName.match(/^CHANGELOG\./i) || fileName.match(/^CONTRIBUTING\./i) || fileName.match(/^LICENSE\./i)) {
      const dirName = path.dirname(filePath).split('/').pop() || 'root';
      groupsWithDocs.add(dirName);
    }
  });
  const undocumentedGroups = Array.from(allGroups).filter(g => !groupsWithDocs.has(g));

  // K. Dependency Direction
  const dependencyDirection = [];
  const groupPairCounts = {};
  importEdges.forEach(edge => {
    const fromGroup = groupOfNode[edge.source];
    const toGroup = groupOfNode[edge.target];
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = `${fromGroup} -> ${toGroup}`;
      groupPairCounts[key] = (groupPairCounts[key] || 0) + 1;
    }
  });
  Object.entries(groupPairCounts).forEach(([key, count]) => {
    const [from, to] = key.split(' -> ');
    const reverseKey = `${to} -> ${from}`;
    const reverseCount = groupPairCounts[reverseKey] || 0;
    if (count > reverseCount) {
      dependencyDirection.push({ dependent: from, dependsOn: to });
    }
  });

  // File stats
  const filesPerGroup = {};
  Object.entries(directoryGroups).forEach(([group, nodes]) => {
    filesPerGroup[group] = nodes.length;
  });
  const nodeTypeCounts = {};
  Object.entries(nodeTypeGroups).forEach(([type, nodes]) => {
    nodeTypeCounts[type] = nodes.length;
  });

  const output = {
    scriptCompleted: true,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges: crossCategoryEdgesArray,
    interGroupImports: interGroupImportsArray,
    intraGroupDensity,
    patternMatches,
    deploymentTopology: {
      hasDockerfile,
      hasCompose,
      hasK8s,
      hasTerraform,
      hasCI,
      infraFiles
    },
    dataPipeline: {
      schemaFiles,
      migrationFiles,
      dataModelFiles,
      apiHandlerFiles
    },
    docCoverage: {
      groupsWithDocs: groupsWithDocs.size,
      totalGroups: allGroups.size,
      coverageRatio: allGroups.size > 0 ? groupsWithDocs.size / allGroups.size : 0,
      undocumentedGroups
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts
    },
    fileFanIn: Object.fromEntries(Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    fileFanOut: Object.fromEntries(Object.entries(fanOut).sort((a, b) => b[1] - a[1]).slice(0, 20))
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}