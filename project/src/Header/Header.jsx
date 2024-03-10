import "./Header.scss"
import React from 'react'
import GPTlogo from "../assets/ai.png";
import logo from "../assets/logo.png"
import { useHasFilesStore, useHeightStore, useShowEditorStore, useShowGPTStore, useShowUploadStore, useWidthStore, useXValStore, useYValStore } from "../activitiesStore"
import { BsArrowRightCircle } from "react-icons/bs"
import GPT from "../GPT/GPT"
import Canvas from "../DraggableList"

const Header = () => {

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
  
  return (
    <div style={{position: "absolute", height: "100vh", width: "100vw", backgroundColor: "transparent"}}>
      <div className="header" style={{position: "fixed", zIndex: 100, width: "100%", userSelect: "none", display: "flex", zIndex: 4, height: "60px", alignItems: "center", backgroundColor: "black", borderBottom: "0.1px solid white"}}>
          <div className="header-button" 
             onClick={()=>{
              if (!showEditor && !showGPT) {setShowEditor(true)} 
              else if (showEditor) {
                if (showGPT) {setShowGPT(false)}
                else {setShowEditor(false)}
              }
              else { setShowGPT(false)}
            }}
            style={{position: "absolute", left: "15px", height: "49px", width: "123px", display: "flex", borderRight: "none",flexDirection: "row", gap: "9px", justifyContent: "center", alignItems: "center", cursor: "pointer"}}>
              <img src={logo} alt="" style={{width: "32px", height: "32px" }} />
              <p style={{ fontSize: "25px", fontWeight: "600", color: "white" }}>React AI</p>
          </div>
          <div className="header-button" onClick={()=>{setShowGPT(true)}} style={{position: "absolute", right: !showGPT && !showEditor && !showUpload && hasFiles? "75px" : "15px", height: "49px", width: "65px", display: "flex", flexDirection: "row", gap: "9px", justifyContent: "center", alignItems: "center", cursor: "pointer"}}>
              <img src={GPTlogo} alt="" style={{width: "32px", height: "32px" }} />
              <p style={{ fontSize: "25px", fontWeight: "600", color: "white" }}>AI</p>
          </div>

          {!showGPT && !showEditor && !showUpload && hasFiles? <div className="header-button" onClick={()=>{setShowEditor(true)}} style={{position: "absolute", right: "5px", height: "49px", width: "65px", display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", cursor: "pointer"}}>
            <BsArrowRightCircle color="white" fontSize={30}/>
          </div> : <></>}
      </div>

      <div style={{display: showGPT? "block" : "none", zIndex: 100, position: "fixed", backgroundColor:"black", marginTop: "60px", height: showGPT? "calc(100vh - 60px)" : 0, width: "100%"}}>
        <GPT/>
      </div>
      
    </div>
  )
}

export default Header