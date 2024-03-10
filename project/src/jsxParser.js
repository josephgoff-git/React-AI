// // jsxParser.js
// import * as parser from '@babel/parser';
// import traverse from '@babel/traverse';
// import generate from '@babel/generator';

// // Use Babel parser to parse JSX
// function parseJSX(code) {
//   const ast = parser.parse(code, {
//     sourceType: 'module',
//     plugins: ['jsx'],
//   });
//   return ast;
// }

// // Continue with the rest of the file using the traverse and generate methods provided by Babel
// // ...

// // Traverse the AST and build the element tree
// function buildElementTree(ast) {
//   let elementTree = null;

//   traverse(ast, {
//     JSXElement(path) {
//       const type = path.node.openingElement.name.name;
//       const props = {};
//       path.node.openingElement.attributes.forEach((attribute) => {
//         props[attribute.name.name] = attribute.value.value;
//       });

//       const node = {
//         type,
//         props,
//         children: [],
//       };

//       if (elementTree === null) {
//         elementTree = node;
//       } else {
//         const parent = path.findParent((p) => p.isJSXElement());
//         const parentNode = parent.node;
//         const parentType = parentNode.openingElement.name.name;

//         const parentInTree = findNodeInTree(elementTree, parentType);
//         parentInTree.children.push(node);
//       }
//     },
//   });

//   return elementTree;
// }

// // Helper function to find a node in the element tree
// function findNodeInTree(tree, type) {
//   if (tree.type === type) {
//     return tree;
//   } else if (tree.children) {
//     for (const child of tree.children) {
//       const result = findNodeInTree(child, type);
//       if (result) {
//         return result;
//       }
//     }
//   }

//   return null;
// }

// // Export the functions for use in other files
// export { parseJSX, buildElementTree };
