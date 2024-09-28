import ReactAI from "./ReactAI/ReactAI"
import Upload from "./Upload/Upload"
import Header from "./Header/Header"
import Canvas from "./DraggableList"
import {useHeightStore, useWidthStore, useXValStore, useYValStore ,  useHasFilesStore, useShowEditorStore, useShowGPTStore, useShowUploadStore, useFirstBuildStore} from "./activitiesStore";
import { useEffect } from "react";
import Playground from "./Playground/Playground"
import App2 from "./App2/App2";

function App() {  
  return <>
    <App2 />
  </>











  var height = useHeightStore((state) => state.height);
  const setHeight = useHeightStore((state) => state.setHeight);

  var width = useWidthStore((state) => state.width);
  const setWidth = useWidthStore((state) => state.setWidth);

  var xVal = useXValStore((state) => state.xVal);
  const setXVal = useXValStore((state) => state.setXVal);

  var yVal = useYValStore((state) => state.yVal);
  const setYVal = useYValStore((state) => state.setYVal);



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

  useEffect(()=>{   
     openIndexedDB()
  },[])

  // CHECK DATABASE FOR EXISTING PROJECT
  function openIndexedDB() {
    let promise = new Promise((resolve, reject) => {
      const request = indexedDB.open('ReactProjectsDatabase', 1);

      request.onerror = event => {
        reject(false);
      };

      request.onsuccess = event => {
        const db = event.target.result;
        if (db.objectStoreNames.length > 0) {
          setHasFiles(true)
          setShowUpload(false)
          setFirstBuild(false)
        }
        resolve(true);
      };
    });
  }

  return (
    <>
      <Header/>
      {hasFiles && showEditor
        ? <ReactAI/> :  
        <Upload/>
      }
      </>
    );
}

export default App;
