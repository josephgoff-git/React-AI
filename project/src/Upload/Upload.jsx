import "./Upload.scss"
import { MdCloudUpload } from "react-icons/md"
import { BsGithub } from "react-icons/bs"
import { GrReactjs } from "react-icons/gr"
import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import JSZip from 'jszip';
import { openDatabase } from "../fileUtils.js"
import { useProjectTitleStore, useClickedNewAppStore, useHasFilesStore, useShowEditorStore, useShowGPTStore, useShowUploadStore, useFirstBuildStore, useDisplayColorStore } from "../activitiesStore"
import server, { blob_base_url } from "../serverConfig.js"

function Upload() {
    var hasFiles = useHasFilesStore((state) => state.hasFiles);
    const setHasFiles = useHasFilesStore((state) => state.setHasFiles);
  
    var showEditor = useShowEditorStore((state) => state.showEditor);
    const setShowEditor = useShowEditorStore((state) => state.setShowEditor);
  
    var showGPT = useShowGPTStore((state) => state.showGPT);
    const setShowGPT = useShowGPTStore((state) => state.setShowGPT);
    
    var showUpload = useShowUploadStore((state) => state.showUpload);
    const setShowUpload = useShowUploadStore((state) => state.setShowUpload);
    
    var firstBuild = useFirstBuildStore((state) => state.firstBuild);
    const setFirstBuild = useFirstBuildStore((state) => state.setFirstBuild);

    var clickedNewApp = useClickedNewAppStore((state) => state.clickedNewApp);
    const setClickedNewApp = useClickedNewAppStore((state) => state.setClickedNewApp);

    var projectTitle = useProjectTitleStore((state) => state.projectTitle);
    const setProjectTitle = useProjectTitleStore((state) => state.setProjectTitle);
  
    var displayColor = useDisplayColorStore((state) => state.displayColor);
    const setDisplayColor = useDisplayColorStore((state) => state.setDisplayColor);
   
  
    let image1 = blob_base_url + "upload.PNG"

    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false)
    const [openProject, setOpenProject] = useState("Open Project")
    const fileInputRef = useRef(null);
    const [smallScreen, setSmallScreen] = useState(window.innerWidth < 800 ? true : false);
    const [createAppText, setCreateAppText] = useState("Create New App")
    const [gitImportText, setGitImportText] = useState("Import From GitHub")

    // UPLOAD PROJECT 
    const handleUpload = async () => {
        const projectInput = document.getElementById('projectInput');
        indexedDB.deleteDatabase("ReactProjectsDatabase");
        console.log("Deleted database");

        const db = await openDatabase(); 
        const transaction = db.transaction('files', 'readwrite');
        const objectStore = transaction.objectStore('files');
        // await objectStore.clear();
        console.log("Cleared database");

        const files = projectInput.files;
        if (!files.length) {
            alert('Please select a folder to upload.');
            return;
        } 

        // files = files.filter(item => !item.name.includes("node_modules"))
        // OR
        // files = Array.from(files).filter((file) => {
        //     return !file.name.includes("node_modules") && !file.webkitRelativePath.includes("node_modules");
        // });
        await storeFiles(files);
        setFirstBuild(true)
        setHasFiles(true)
        setShowEditor(true)
        setShowUpload(false)
    };

    async function storeFiles(files) {
        console.log(files)
        let filesList = Array.from(files)
        for (let i = 0; i < filesList.length; i += 1000) {
            let filesChunk = filesList.slice(i, i + 1000);
            await Promise.all(filesChunk.map(file => storeFile(file)));
            setProgress((i / filesList.length) * 100)
        }
    }

    async function storeFile(file) {
        return new Promise(async (resolve, reject) => {
            if (file.webkitRelativePath.includes('/node_modules/')) {
                resolve()
            } else {
                let fileTitle = file.webkitRelativePath.split("/")[0]
                if (projectTitle !== fileTitle) {setProjectTitle(fileTitle)}
                const fileReader = new FileReader();
                fileReader.onload = async event => {
                    try {
                        const fileContent = event.target.result;
                        const blob = new Blob([fileContent], { type: file.type });
                        
                        const fileData = {
                            filename: file.name,
                            
                        filepath: file.webkitRelativePath,
                        content: blob,
                        };
                        
                        const db = await openDatabase();
                        const transaction = db.transaction('files', 'readwrite');
                        const objectStore = transaction.objectStore('files');
                        await objectStore.put(fileData);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                };
            
            fileReader.readAsArrayBuffer(file);
            }
        });
    }

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        console.log("Dropped files:", files);
    };

    const handleClick = () => {
        fileInputRef.current.click();
        // setOpenProject("Opening Project...")
    };

    const handleChange = (e) => {
        const files = e.target.files;
        setOpenProject("Uploading Project...")
        setIsUploading(true)
        if (files) { 
            handleUpload() 
            // const wakeServer = getMessage("Hi!")
        }
    };

    async function getMessage(messages) {
        // const proxyUrl = 'http://localhost:3001/gpt-message';
        // const proxyUrl = 'https://reactaiserver.azurewebsites.net/gpt-message';
        const proxyUrl = `${server}/gpt-message`

        try {
          const response = await axios.post(proxyUrl, { messages });
          return response.data
        } catch (error) {
          return 'Something went wrong...'
        }
    }

    useEffect(() => {
        
        const handleResize = () => {
            setSmallScreen(window.innerWidth < 800 ? true : false);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // CREATE NEW APP
    const handleNewAppClick = async () => {
        // let backgroundImage = document.getElementById("image1")
        // backgroundImage.style.transform = "rotate(90deg)"
        // return;

        setClickedNewApp(true)
        setDisplayColor("black")
        setCreateAppText("Building Project Files...")
        const git_user = "josephgoff-git";
        // const git_repo = "react-bootstrap-2";
        const git_repo = "AppTemplate";
        // const git_repo = "App4";
        const branch = "master";

        // const proxyUrl = 'http://localhost:3001/github-proxy';
        // const proxyUrl = 'https://reactaiserver.azurewebsites.net/github-proxy';
        const proxyUrl = `${server}/github-proxy`

        const githubApiUrl = `https://api.github.com/repos/${git_user}/${git_repo}/zipball/${branch}`;
      
        try {
          const response = await axios.get(`${proxyUrl}?url=${encodeURIComponent(githubApiUrl)}`, {
            responseType: 'arraybuffer',
          });
      
          const zipData = new Uint8Array(response.data);
          const jszip = new JSZip();
          const unzippedFiles = await jszip.loadAsync(zipData);
         
          let process = 0
          const filesArray = [];
          for (const [relativePath, file] of Object.entries(unzippedFiles.files)) {
            // If file is actually a file
            if (file.dir || file._data.uncompressedSize === 0) {
                continue;
            // And if file is not from node modules
            } else if (file.name.includes("/node_modules/")) {
                continue
            // Then proceed to store
            } else {
                const blob = await file.async('blob');
                const fileName = file.name.replace(/^[^/]+\//, 'react-app/');
                const fileType = blob.type;
                const fileName1 = fileName.split('/').pop();
        
                const fileObject = {
                    blob,
                    name: fileName1,
                    type: fileType,
                    webkitRelativePath: fileName,
                };
                filesArray.push(fileObject);
            }
            process += 1;
          }

          setCreateAppText("Storing Files...")
          await handleGitUpload(filesArray);
          setCreateAppText("Create New App")
      
        } catch (error) {
          console.error('Error downloading or processing the zip file:', error);
          setCreateAppText("Create New App")
          setClickedNewApp(false)
        }
    };

    // BUILD
    // const handleNewAppClick = async () => {
    //     console.log("getting files")
    //     let files = await getFilesFromIndexedDB()
    //     console.log("finished getting files")
    //     console.log(files)

    //     let response = await sendFilesToServer(files)
    // }



    // IMPORT FROM GIT
    const handleGitClick = async () => {
        let git_user = null;
        let git_repo = null;
        let branch = null;
        git_user = prompt("Enter repository owner's username:");
        if (git_user) {git_repo = prompt("Enter repository name");}
        if (git_user && git_repo) {
            try {
                // Get branch for given repository
                const response = await axios.get(`https://api.github.com/repos/${git_user}/${git_repo}`);
                branch = response.data.default_branch
                setGitImportText('Fetching "' + branch + '" Branch...')
            } catch (error) {
                console.error('Error fetching data:', error);
                setGitImportText('Import From GitHub')
            }
        }

        // Begin fetching zip
        if (branch !== null) {

            // const proxyUrl = 'http://localhost:3001/github-proxy';
            // const proxyUrl = 'https://reactaiserver.azurewebsites.net/github-proxy';
            const proxyUrl = `${server}/github-proxy`

            const githubApiUrl = `https://api.github.com/repos/${git_user}/${git_repo}/zipball/${branch}`;
        
            try {
            const response = await axios.get(`${proxyUrl}?url=${encodeURIComponent(githubApiUrl)}`, {
                responseType: 'arraybuffer',
            });
            setGitImportText('Building Project Files...')
        
            const zipData = new Uint8Array(response.data);
            const jszip = new JSZip();
            const unzippedFiles = await jszip.loadAsync(zipData);
            
            let process = 0
            const filesArray = [];
            for (const [relativePath, file] of Object.entries(unzippedFiles.files)) {
                // If file is actually a file
                if (file.dir || file._data.uncompressedSize === 0) {
                    continue;
                // And if file is not from node modules
                } else if (file.name.includes("/node_modules/")) {
                    continue
                // Then proceed to store
                } else {
                    const blob = await file.async('blob');
                    const fileName = file.name;
                    const fileType = blob.type;
                    const fileName1 = fileName.split('/').pop();
            
                    const fileObject = {
                        blob,
                        name: fileName1,
                        type: fileType,
                        webkitRelativePath: fileName,
                    };
                    filesArray.push(fileObject);
                }
                process += 1;
            }

            setGitImportText('Storing Files...')
            await handleGitUpload(filesArray);
            setGitImportText('Import From GitHub')
        
            } catch (error) {
            console.error('Error downloading or processing the zip file:', error);
            setGitImportText('Import From GitHub')
            }
        }
    };

    async function handleGitUpload(files) {
        function deleteDatabase() {
            return new Promise((resolve, reject) => {
              const request = indexedDB.deleteDatabase("ReactProjectsDatabase");
          
              request.onsuccess = () => {
                console.log("Deleted database");
                resolve();
              };
          
              request.onerror = () => {
                console.error("Error deleting database");
                reject();
              };
            });
          }
        // indexedDB.deleteDatabase("ReactProjectsDatabase");
        await deleteDatabase()
        console.log("Deleted database");
        const db = await openDatabase(); 
        console.log("Opened new database");
        const transaction = db.transaction('files', 'readwrite');
        console.log("Began transaction");
        const objectStore = transaction.objectStore('files');
        console.log("Initiated Object Store");
        await objectStore.clear();
        console.log("Cleared database");

        if (!files.length) {
            alert('Please select a folder to upload.');
            return;
        }

        await storeGitFiles(files);
        setFirstBuild(true)
        setHasFiles(true)
        setShowEditor(true)
        setShowUpload(false)
    };

    async function storeGitFiles(files) {
        console.log(files)
        let filesList = Array.from(files)
        for (let i = 0; i < filesList.length; i += 1000) {
            let filesChunk = filesList.slice(i, i + 1000);
            await Promise.all(filesChunk.map(file => storeGitFile(file)));
            // setProgress((i / filesList.length) * 100)
        }
    }

    async function storeGitFile(file) {
        return new Promise(async (resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async event => {
                try {
                    const fileContent = event.target.result;
                    const blob = new Blob([fileContent], { type: file.type });

                    const fileData = {
                        filename: file.name,
                        filepath: file.webkitRelativePath,
                        content: blob,
                    };

                    if (fileData.filepath.startsWith('react-project/node_modules/')) {
                        console.log(1)
                    }

                    const db = await openDatabase();
                    const transaction = db.transaction('files', 'readwrite');
                    const objectStore = transaction.objectStore('files');
                    await objectStore.put(fileData);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };

            fileReader.readAsArrayBuffer(file.blob);
        });
    }


    // async function getFilesFromIndexedDB() {
    //     return new Promise((resolve, reject) => {
    //         console.log("opening")
    //         const request = indexedDB.open('ReactProjectsDatabase'); 
        
    //         request.onsuccess = (event) => {
    //             console.log("opened database")
    //             const db = event.target.result;
    //             const transaction = db.transaction(['files'], 'readonly');
    //             const objectStore = transaction.objectStore('files');
    //             const files = [];
    //             const cursorRequest = objectStore.openCursor();
            
    //             cursorRequest.onsuccess = (e) => {
    //                 const cursor = e.target.result;
    //                 if (cursor) {
    //                     const file = cursor.value;
    //                     if (!file.filepath.includes("/node_modules")) {
    //                         console.log(file.filepath) 
    //                         files.push(file);
    //                     }
    //                     cursor.continue();
    //                 } else {
    //                     resolve(files);
    //                 }
    //             };
            
    //             cursorRequest.onerror = (e) => {
    //                 reject(e.target.error);
    //             };
    //         }
        
    //         request.onerror = (event) => {
    //             reject(event.target.error);
    //         };
    //     });
    // }

    // async function sendFilesToServer(files) {
    //     try {
    //         const formData = new FormData();
    //         files.forEach((fileObj, index) => {
    //             const filePath = fileObj.filepath
    //             const file = new File([fileObj.content], filePath);

    //             const pathParts = filePath.split('/');
    //             const fileName = pathParts.pop();
    //             const relativePath = pathParts.join('/');


    //             formData.append("file", file);
    //             formData.append("filenames", `${relativePath}/${fileName}`);
    //         });
        
    //         const response = await fetch('http://localhost:3001/upload-files', {
    //             method: 'POST',
    //             body: formData,
    //         });
        
    //         if (response.ok) {
    //             console.log('Files sent successfully.');
    //         } else {
    //             console.error('Error sending files to the server.');
    //         }
    //     } catch (error) {
    //         console.error('An error occurred:', error);
    //     }
    // }
      


    return (
        <div className="app">
            <div style={{ zIndex: 1, userSelect: "none", width: "100vw", height: "calc(100vh - 60px)", position: "fixed", objectFit: "contain", marginTop: "60px" }}>
                <img loading='lazy' id="image1" src={image1} alt="" style={{ transform: "rotate(0deg)", transition: "1s ease", width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ display: "flex", flexDirection: smallScreen ? "column" : "row", zIndex: 3 }}>

                {/* <div style={{
                    zIndex: 3,
                    width: "100%",
                    height: smallScreen ? "calc((100vh - 70px) * 0.41)" : "calc(100vh - 70px)",
                    backgroundColor: "transparent",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                </div> */}

                <div
                    style={{
                        marginTop: "calc(100vh - 170px)",
                        zIndex: 3,
                        width: "100%",
                        height: "100px",
                        backgroundColor: "transparent",
                        display: "flex",
                        // justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                        gap: smallScreen? "13px" : "calc(2vh + 8px)"
                    }}>

                    <div
                        className="upload-page-button"
                        style={{
                            width: smallScreen? "72%" : "55%",
                            maxWidth: "400px",
                            height: "100px",
                            backgroundColor: "black",
                            border: "0.1px solid #666",
                            borderRadius: "35px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            boxShadow: "0 0 15px #444"
                        }}
                        onClick={handleNewAppClick}>
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <p style={{ userSelect: "none", color: "white", fontSize: smallScreen ? "calc(2vw + 11px)" : "calc(1vw + 11px)", fontWeight: "700", opacity: 0.75 }}>{createAppText}</p>
                            <GrReactjs fontSize={30} style={{ marginLeft: "15px", color: "white", opacity: 0.75 }} />
                        </div>
                    </div>
                   
                    {/* <div
                        className="upload-page-button"
                        style={{
                            width: smallScreen? "72%" : "55%",
                            height: smallScreen ? "120px" : "calc(7vw + 70px)",
                            minHeight: "120px",
                            maxHeight: "160px",
                            backgroundColor: "black",
                            border: "0.1px solid #666",
                            borderRadius: "25px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: smallScreen ? 0 : "6vw",
                            boxShadow: "0 0 15px #444"
                        }}
                        onClick={handleGitClick}>
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <p style={{ userSelect: "none", color: "white", fontSize: smallScreen ? "calc(2vw + 11px)" : "calc(1vw + 11px)", fontWeight: "700", opacity: 0.75 }}>{gitImportText}</p>
                            <BsGithub fontSize={30} style={{ marginLeft: "15px", color: "white", opacity: 0.75 }} />
                        </div>
                    </div> 

                    <div
                        className="upload-page-button"
                        style={{
                            width: smallScreen? "72%" : "55%",
                            height: smallScreen ? "120px" : "calc(7vw + 70px)",
                            minHeight: "120px",
                            maxHeight: "160px",
                            backgroundColor: "black",
                            border: "0.1px solid #666",
                            borderRadius: "25px",
                            cursor: "pointer",
                            marginBottom: smallScreen ? "16px" : 0,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            marginLeft: smallScreen ? 0 : "6vw",
                            boxShadow: "0 0 15px #444"
                        }}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={handleClick}>
                        <input
                            type="file"
                            id="projectInput"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            multiple
                            directory="true"
                            webkitdirectory="true"
                            onChange={handleChange}
                        />
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <p style={{ userSelect: "none", color: "white", fontSize: smallScreen ? "calc(2vw + 11px)" : "calc(1vw + 11px)", fontWeight: "700", opacity: 0.75 }}>{openProject}</p>
                            <MdCloudUpload fontSize={30} style={{ marginLeft: "15px", color: "white", opacity: 0.75 }} />
                        </div>

                        {isUploading && <div style={{ width: "69%", marginTop: "12px" }} className="progress-bar">
                            <div className="progress" style={{ width: `${progress}%` }}>
                            </div>
                        </div>}

                    </div> */}

                </div>

            </div>
        </div>
    );
}

export default Upload;