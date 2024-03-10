import path from 'path-browserify';

  export async function openDatabase() {
    // console.log("Opening Database")
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReactProjectsDatabase', 1);

      request.onerror = event => {
        reject('Error opening database');
      };

      request.onsuccess = event => {
        const db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        db.createObjectStore('files', { keyPath: 'filepath' });
      };

      request.onblocked = event => {
        console.error('Database open request blocked');
      };
    });
  }  
  
  export async function retrieveFilePaths() {
    return new Promise(async (resolve, reject) => {
      const db = await openDatabase(); // Open or create the database
      const transaction = db.transaction('files', 'readonly');
      const objectStore = transaction.objectStore('files');
      const request = objectStore.getAllKeys();

      request.onsuccess = event => {
        const storedFiles = event.target.result;
        resolve(storedFiles);
      };

      request.onerror = event => {
        reject('Error retrieving files');
      };
    });
  }

  export async function storeFile(filePath, fileContents) {
    const blob = fileContents instanceof Blob ? fileContents : new Blob([fileContents])
    
    const fileData = {
      filename: path.basename(filePath),
      filepath: filePath,
      content: blob, 
    };

    const db = await openDatabase(); // Open or create the database
    const transaction = db.transaction('files', 'readwrite');
    const objectStore = transaction.objectStore('files');
    await objectStore.put(fileData);
  };

  export async function retrieveFileTree() {
    let filePaths = await retrieveFilePaths();
    let fileTree = {};
    for (let path of filePaths) {
      let components = path.split('/');
      let node = fileTree;
      for (let component of components.slice(0, -1)) {
        if (!(component in node)) {
          node[component] = {}
        }
        node = node[component]
      }
      node[components[components.length-1]] = true;
    }
    return fileTree;
  }

  export async function retrieveFileByPath(filePath, base64 = false) {
    return new Promise(async (resolve, reject) => {
      const db = await openDatabase(); // Open or create the database
      const transaction = db.transaction('files', 'readonly');
      const objectStore = transaction.objectStore('files');
      const request = objectStore.get(filePath);

      request.onsuccess = event => {
        const storedFile = event.target.result;
        if (storedFile) {
          resolve(storedFile.content);
        } else {
          reject('File not found');
        }
      };

      request.onerror = event => {
        reject('Error retrieving file');
      };
    }).then(blob => new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = function() {
        let result = reader.result;
        if (base64) {
          // Remove `data:application/octet-stream;base64,` prefix
          result = result.slice(result.indexOf(',') + 1);
        }
        resolve(result);
      }
      reader.onerror = function(error) {
        reject(error);
      }
      if (base64) {
        reader.readAsDataURL(blob);
      }
      else {
        reader.readAsText(blob);
      }
    }));
  }

  export function retrieveTreeNodeByPath(tree, filePath) {
    let node = tree;
    for (let component of filePath.split('/')) {
      node = node[component];
    }
    return node;
  }

 export function resolvePath(tree, filePath) {
    let fileName = path.basename(filePath);
    let parentDir = retrieveTreeNodeByPath(tree, path.dirname(filePath));
    if (parentDir[fileName] !== true && parentDir[`${fileName}.js`] === true) {
      filePath = `${filePath}.js`;
    }
    else if (parentDir[fileName] !== true && parentDir[`${fileName}.jsx`] === true) {
      filePath = `${filePath}.jsx`;
    }
    else if (fileName === '.') {
      filePath = path.join(filePath, 'index.js');
    }
    else if (typeof parentDir[fileName] === 'object' && parentDir[fileName]['index.js'] === true) {
      filePath = path.join(filePath, 'index.js');
    }
    return filePath;
  }

 export async function resolvePackage(tree, filePath) {
    let fileName = path.basename(filePath);
    let parentDir = retrieveTreeNodeByPath(tree, path.dirname(filePath));
    if (typeof parentDir[fileName] === 'object' && parentDir[fileName]['package.json'] === true) {
      let packageJsonData = await retrieveFileByPath(path.join(filePath, 'package.json'));
      let mainPath = JSON.parse(packageJsonData).main;
      if (mainPath) {
        filePath = resolvePath(tree, path.join(filePath, mainPath));
      }
    }
    return resolvePath(tree, filePath);
  }


  export async function deleteFile(filePath) {
    return new Promise(async (resolve, reject) => {
      const db = await openDatabase(); // Open or create the database
      const transaction = db.transaction('files', 'readwrite');
      const objectStore = transaction.objectStore('files');
      const request = objectStore.delete(filePath);
  
      request.onsuccess = event => {
        resolve('File deleted successfully');
      };
  
      request.onerror = event => {
        reject('Error deleting file');
      };
    });
  }





  