import "./ReactAI.css";
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Editor from '@monaco-editor/react';
import * as Babel from '@babel/standalone';
import * as rollup from '@rollup/browser';
import dedent from 'dedent';
import path from 'path-browserify';
import JSZip from 'jszip';
import lottie from 'lottie-web';
import animationData1 from '../loadingAnimation.json'; 
import { getIndexHTML, indexJS } from "./static";
import Upload from "../Upload/Upload"
import bot from "../assets/ai.png";
import user from "../assets/user.png"
import logo from "../assets/logo.png"
import send from "../assets/send.svg";

// ICONS
import { CgPlayListAdd } from 'react-icons/cg';
import { AiFillCloseCircle } from 'react-icons/ai';
import { HiPlusSm } from 'react-icons/hi';
import { BsChevronLeft, BsWindow } from 'react-icons/bs'
import { BsWindowSplit } from 'react-icons/bs'
import { FaBars, FaBullseye } from 'react-icons/fa';
import { FiEdit } from 'react-icons/fi'
import { BsArrowRightCircle } from "react-icons/bs"
import { BsThreeDotsVertical } from 'react-icons/bs';
import { BsArrowRightCircleFill } from 'react-icons/bs';
import { BsQuestionCircle } from 'react-icons/bs';
import { SiReact } from 'react-icons/si';
import { BsCalculator, BsChevronDown } from 'react-icons/bs'
import { IoChevronBack, IoClose } from 'react-icons/io5'
import { BsTrash3Fill } from "react-icons/bs";
import { FaUndoAlt } from "react-icons/fa";
import { IoAddCircleOutline } from "react-icons/io5"
import { FaLink } from "react-icons/fa6";

// SUPPORT
import { useDisplayColorStore, useComponentIndexOverStore, useProjectTitleStore, useClickedNewAppStore, useHasFilesStore, useShowEditorStore, useShowGPTStore, useFirstBuildStore, useCurrentStackStore, useHeightStore, useWidthStore, useXValStore, useYValStore } from "../activitiesStore"
import { openDatabase, storeFile, retrieveFileTree, retrieveFileByPath, retrieveFilePaths, retrieveTreeNodeByPath, resolvePath, resolvePackage, deleteFile } from "../fileUtils.js"
import semver from 'semver';
import untar from 'js-untar';
import axios from 'axios';
import Draggable from "react-draggable";

import Canvas from "../DraggableList"
import { parse } from 'html-parse-stringify2';

import server, { blob_base_url } from "../serverConfig.js"



const binaryFileTypes = ['svg', 'png', 'jpg', 'jpeg'];
const staticFileTypes = {
  svg: fileData => `return "data:image/svg+xml;base64,${fileData}";`,
  png: fileData => `return "data:image/png;base64,${fileData}";`,
  jpg: fileData => `return "data:image/jpeg;base64,${fileData}";`,
  jpeg: fileData => `return "data:image/jpeg;base64,${fileData}";`,
  css: fileData => {
    let escaped = fileData.replace(/[\n]/g, '').replace(/"/g, '\\"');
    return dedent`
      var style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = "${escaped}";
      document.head.appendChild(style);
    `;
  },
}

function OutsideClickDetector({ children, onOutsideClick }) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        // Click occurred outside the warning message div
        onOutsideClick();
      }
    }

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onOutsideClick]);

  return <div ref={wrapperRef}>{children}</div>;
}

function CSSOutsideClickDetector({ children, onOutsideClick }) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      console.log(event)
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        // Check if the clicked element is excluded (ID "cssArrow")
        // let isExcludedElement = event.target.id === 'cssArrow';
        onOutsideClick();
      }
    }

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onOutsideClick]);

  return <div ref={wrapperRef}>{children}</div>;
}


const ReactAI = () => {
  var height = useHeightStore((state) => state.height);
  const setHeight = useHeightStore((state) => state.setHeight);

  var width = useWidthStore((state) => state.width);
  const setWidth = useWidthStore((state) => state.setWidth);

  var xVal = useXValStore((state) => state.xVal);
  const setXVal = useXValStore((state) => state.setXVal);

  var yVal = useYValStore((state) => state.yVal);
  const setYVal = useYValStore((state) => state.setYVal);



  // STATES
  var hasFiles = useHasFilesStore((state) => state.hasFiles);
  const setHasFiles = useHasFilesStore((state) => state.setHasFiles);

  var showEditor = useShowEditorStore((state) => state.showEditor);
  const setShowEditor = useShowEditorStore((state) => state.setShowEditor);

  var showGPT = useShowGPTStore((state) => state.showGPT);
  const setShowGPT = useShowGPTStore((state) => state.setShowGPT);
  
  var firstBuild = useFirstBuildStore((state) => state.firstBuild);
  const setFirstBuild = useFirstBuildStore((state) => state.setFirstBuild);

  var clickedNewApp = useClickedNewAppStore((state) => state.clickedNewApp);
  const setClickedNewApp = useClickedNewAppStore((state) => state.setClickedNewApp);

  var projectTitle = useProjectTitleStore((state) => state.projectTitle);
  const setProjectTitle = useProjectTitleStore((state) => state.setProjectTitle);
  
  var currentStack = useCurrentStackStore((state) => state.currentStack);
  const setCurrentStack = useCurrentStackStore((state) => state.setCurrentStack);

  var displayColor = useDisplayColorStore((state) => state.displayColor);
  const setDisplayColor = useDisplayColorStore((state) => state.setDisplayColor);
 

  const [refreshCount, setRefreshCount] = useState(1) 
  const [hasRunOnce, setHasRunOnce] = useState(false)
  const [AIResults, setAIResults] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [editorCurrent, setEditorCurrent] = useState("")
  const [AIMode, setAIMode] = useState("ALTER")
  const [warning, setWarning] = useState(false)
  const [warningText1, setWarningText1] = useState("Building Project...")
  const [warningText2, setWarningText2] = useState("Please wait, this may take a moment")
  const [warningText3, setWarningText3] = useState("")
  const [dotsOpen, setDotsOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [slate, setSlate] = useState(0)
 

  // Editor States 
  const [linePosition, setLinePosition] = useState({});
  const [lineEditOperation, setLineEditOperation] = useState({})
  const [editorObject, setEditorObject] = useState({})
  const [monacoObject, setMonacoObject] = useState({})
  const [editorScrollbar, setEditorScrollbar] = useState("hidden")
  const [fullScreen, setFullScreen] = useState(false)
  const [fullScreenText, setFullScreenText] = useState("Full Screen")
  // "visible"
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0);
  const [storingProgress, setStoringProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canCloseWarning, setCanCloseWarning] = useState(false)
  const [renderButtonWidths, setRenderButtonWidths] = useState("25%")
  const [canShowWarning, setCanShowWarning] = useState(true)
  const [canShowBuildMode, setCanShowBuildMode] = useState(true)
  // AI States
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState("");
  const [GPTModel, setGPTModel] = useState("3.5-turbo")
  const [numberOfRenders, setNumberOfRenders] = useState(4)
  const [modelTemperature, setModelTemperature] = useState(0.8)
  
  // File Upload States
  const [originalFile, setOriginalFile] = useState("");
  const [exportText, setExportText] = useState("Export Zip")
  const [displayWarningProgress, setDisplayWarningProgress] = useState(false)

  // Display References
  const editorRef = useRef(null);
  const frameRef = useRef(null);
  const loaderRef = useRef(null); 
  const formRef = useRef(null);
  const uploadRef = useRef(null);

  // Build Mode
  const [buildMode, setBuildMode] = useState(false)
  const [BuildAlert1Text, setBuildAlert1Text] = useState("Your Project")
  const [BuildButton1Text, setBuildButton1Text] = useState("Let's Get Started")
  const [buildModeStack, setBuildModeStack] = useState(false)
  const [buildingStack, setBuildingStack] = useState(false)
  const [updateStackNum, setUpdateStackNum] = useState(1)
  const [selectedBuildComponent, setSelectedBuildComponent] = useState("")
  const [lastEdited, setLastEdited] = useState("")
  const [currentComponentIndex, setCurrentComponentIndex] = useState(0)
  
  // Components 
  const [componentData, setComponentData] = useState([])
  const [draggable, setDraggable] = useState(false)

  // Component Lists
  let imgLocation = blob_base_url
  // let imgLocation = 'https://socialwebappblobs.blob.core.windows.net/blobs/'
  const [gitIMGs, setGitIMGs] = useState(
    [
      // Navbars
      [
        {name: "Navbar1", component: "Navbars", img: imgLocation + "Navbar3.png"},
        {name: "Navbar2", component: "Navbars", img: imgLocation + "Navbar2.png"},
        {name: "Navbar3", component: "Navbars", img: imgLocation + "Navbar1.png"},
      ],
      // Heros
      [
        {name: "Hero1", component: "Heros", img: imgLocation + "Hero1.png"},
        {name: "Hero2", component: "Heros", img: imgLocation + "Hero2.png"},
        {name: "Hero3", component: "Heros", img: imgLocation + "Hero3.png"},
      ],
      // Displays
      [
        {name: "Display1", component: "Displays", img: imgLocation + "Display4.png"},
        {name: "Display2", component: "Displays", img: imgLocation + "Display2-2.png"},
        {name: "Display3", component: "Displays", img: imgLocation + "Display3.png"},
        {name: "Display4", component: "Displays", img: imgLocation + "Display1.png"},
      ],
      // Images 
      [
        {name: "Image1", component: "Images", img: imgLocation + "Display2.png"},
        {name: "Image2", component: "Images", img: imgLocation + "Display3.png"},
        {name: "Image3", component: "Images", img: imgLocation + "Display1.png"},
      ],
      // Footers
      [
        {name: "Footer1", component: "Footers", img: imgLocation + "Footer1.png"},
        {name: "Footer2", component: "Footers", img: imgLocation + "Footer2.png"},
      ]
    ]
  )

  // Pages
  const [buildModeStackRoute, setBuildModeStackRoute] = useState("Pages")
  const [pageNames, setPageNames] = useState(["Home"])
  const [currentPage, setCurrentPage] = useState(0)

  // Deployment
  const [deploymentText, setDeploymentText] = useState("Deploy")


  // Current Component Element Tree
  // Tree displayed to user
  const [elementTree, setElementTree] = useState({ "Component": {}  })
  // Parsed tree object (cleaned of whitespace)
  const [elementObjectTree, setElementObjectTree] = useState([])
  const [expandedElementNodes, setExpandedElementNodes] = useState({});
  const [currentElementPath, setCurrentElementPath] = useState("")

  // Component Editor
  // TEXT 
  const [cssTextValue, setCSSTextValue] = useState("")
  const [showAddTextInput, setShowAddTextInput] = useState(true)
  
  // IMAGES
  const [showImgSRCInput, setShowImgSRCInput] = useState(true)
  const [imgSRCValue, setImgSRCValue] = useState("")
  const [optionsSelector, setOptionsSelector] = useState("")
  const [currentIMGSearchTerm, setCurrentIMGSearchTerm] = useState("")
  const unsplashBase = "https://source.unsplash.com/random/"
  const [currentSRCArray, setCurrentSRCArray] = useState([])
  const [buildingSRCArray, setBuildingSRCArray] = useState(false)
  // Trash Icon
  const [clickedTrash, setClickedTrash] = useState(false)
  const [backupText, setBackupText] = useState("")

  // STYLES
  const [currentCSSFile, setCurrentCSSFile] = useState("")
  const [currentCSSFileObject, setCurrentCSSFileObject] = useState({})
  const [currentCSSClassesObject, setCurrentCSSClassesObject] = useState({})
  const [currentCSSIDsObject, setCurrentCSSIDsObject] = useState({})
  const [count1, setCount1] = useState(1)
  
  let validCSSAttributes = ['align-content', 'align-items', 'align-self', 'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility', 'background', 'background-attachment', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'border', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-shadow', 'box-sizing', 'caption-side', 'clear', 'clip', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'content', 'counter-increment', 'counter-reset', 'cursor', 'direction', 'display', 'empty-cells', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'height', 'justify-content', 'left', 'letter-spacing', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height', 'min-width', 'opacity', 'order', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before', 'page-break-inside', 'perspective', 'perspective-origin', 'position', 'quotes', 'resize', 'right', 'tab-size', 'table-layout', 'text-align', 'text-align-last', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-indent', 'text-justify', 'text-overflow', 'text-shadow', 'text-transform', 'top', 'transform', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'vertical-align', 'visibility', 'white-space', 'width', 'word-break', 'word-spacing', 'word-wrap', 'z-index']
  const [showAddCSSAttribute1, setShowAddCSSAttribute1] = useState(false)
  const [showAddCSSAttribute2, setShowAddCSSAttribute2] = useState(false)
  const [showPopup, setShowPopup] = useState(false);
  const [currentCSSItemIndex, setCurrentCSSItemIndex] = useState(null)
  const [cssInputValue, setCSSInputValue] = useState("")
  const [showCSSAttributeList, setShowCSSAttributeList] = useState(false)
  const [filteredList, setFilteredList] = useState([])
  const [attribute1, setAttribute1] = useState("")
  const [attribute2, setAttribute2] = useState("")

  const cssInputRef = useRef(null);
  const attribute2InputRef = useRef(null);
  
  const id_cssInputRef = useRef(null);
  const id_attribute2InputRef = useRef(null);
  const [cssEditingType, setCSSEditingType] = useState("")
  
  // a Tags
  const [showaTagInput, setShowaTagInput] = useState(false)
  const [aTagInputValue, setaTagInputValue] = useState("")
  const [clickedaTagTrash, setClickedaTagTrash] = useState(false)
  const [backupaTagText, setBackupaTagText] = useState("")

  // Link tags
  const [currentLink, setCurrentLink] = useState(" ")
  const [currentComponentArray, setCurrentComponentArray] = useState([])
  const [currentRelaventIndex, setCurrentRelaventIndex] = useState(null)
  const [selectingLink, setSelectingLink] = useState(false)

  const [selectingLinkStep1, setSelectingLinkStep1] = useState(false)
  const [selectingLinkStep2, setSelectingLinkStep2] = useState(false)
  const [selectionChoice, setSelectionChoice] = useState("")
  const [currentLinkChoice, setCurrentLinkChoice] = useState(" ")
  const [linkActive, setLinkActive] = useState(false)

  // Adding a Tags
  const [selectingaTagInputValue, setSelectingaTagInputValue] = useState("")
  const [aTagActive, setaTagActive] = useState(false)
  const aTagInput = useRef(null);


  // useEffect(() => { 
  //   // // Mouse Event for deleting from the stack
  //   // const handleMouseDown = async (event) => {
  //   //   // console.log(pageNames)
  //   //   const closeButton = event.target.closest(".component-item-close");
  //   // };
    
  //   // document.addEventListener('mousedown', handleMouseDown);
    
  //   // // Clean up the event listeners when the component is unmounted
  //   // return () => {
  //   //   document.removeEventListener('mousedown', handleMouseDown);
  //   // };
  //   // let results = []
  //   // for (let i=0;i<10;i++) {
  //   //   let result = await getUnsplashRandomImageUrl()
  //   //   results.push(result) 
  //   // }
  //   // console.log(results)
  //   // setCurrentSRCArray(results)
  // }, []);

  // Element Tree 
  let possibleSelfClosing = [`<area`,
  `<base`,
  `<br`,
  `<col`,
  `<embed`,
  `<hr`,
  `<img`,
  `<input`,
  `<link`,
  `<meta`,
  `<param`,
  `<source`,
  `<track`,
  `<wbr`,
  `<command`, 
  `<keygen`, 
  `<menuitem`, 
  `<frame` ]

  function countAsterisks(inputString) {
    let count = 0;
  
    for (let i = 0; i < inputString.length; i++) {
      if (inputString[i] === '*') {
        count++;
      }
    }
  
    return count;
  }

  // const handleElementToggle = (nodePath) => {
  //   setExpandedElementNodes((prevState) => ({
  //     ...prevState,
  //     [nodePath]: !prevState[nodePath],
  //   }));
  // };

  const renderElementTreeNode = (node, path) => {
    // Render a file node
    if (typeof node !== 'object' || node === true) {
      // Render a file node
      return <div className="tree-item"  
      onClick={async ()=>{
        await handleClickedElementNode(path, "", 0)
      }} 
      style={{color: currentElementPath === path? "rgb(33, 220, 255)" : "white", marginBottom: "3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: "unset", fontSize: "15px"}} key={path}>{removeAsterisks(path.split('/').pop())}</div>; 
    }

    // Render a folder node 
    let root = false
    let isExpanded = expandedElementNodes[path] || false;
    // If root 
    if (!path.includes("/")) {
      root = true
      isExpanded = true
    }  

    return (
      <div key={path}>
        <div className="tree-item" style={{color: currentElementPath === path? "rgb(33, 220, 255)" : "white", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginBottom: "3px", fontFamily: "unset", display: root? "none" : "block", fontSize: "15px"}}  
        onClick={async () => { 
          // if (!root) {handleElementToggle(path)}; 
          await handleClickedElementFolder(path, "", 0)
        }}>
          {isExpanded ? <BsChevronDown color="white" size={12}/> : <BsChevronDown style={{transform: "rotate(-90deg)"}} color="white" size={12}/>} {removeAsterisks(path.split('/').pop())} {/* Display only the folder name */}
        </div>
        {isExpanded && (
          <div className="nested-tree" style={{ marginLeft: 14}}>
            {Object.entries(node).map(([nodeName, nestedNode]) =>
              renderElementTreeNode(nestedNode, `${path}/${nodeName}`)
            )}
          </div>
        )}
      </div>
    );
  };

  async function handleClickedElementFolder(path, cssObject, index) {
    resetCSSPopup()

    setCurrentElementPath(path)
    setShowAddTextInput(false)
    setShowImgSRCInput(false)

    // Cannot be an image -> this will change 
    setOptionsSelector("tag")

    await setCSSObject("", "", path, cssObject, index)
  }

  async function handleClickedElementNode(path, cssObject, index) {
    resetCSSPopup()
    
    setCurrentElementPath(path)
    setClickedTrash(false)

    let file = "";
    try {file = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][currentComponentIndex]}/${currentStack[currentPage][currentComponentIndex]}.js`);
    } catch (error) {console.log(error); }
    if (file === "") {return}
    let componentArray = await componentMapped(file);
    let relaventIndex = await locateCorrectIndex(componentArray, path)

    let textBetween = false
    let srcAttribute = false
    let nodeType = path.split("/").pop()
    // If non self-closing node 
    if (!possibleSelfClosing.includes("<" + nodeType) && !componentArray[relaventIndex].includes("/>")) {
      let textData = await grabTextData(componentArray, relaventIndex)
      textBetween = true
      setCSSTextValue(textData)
      setOptionsSelector("tag")
    } else {
      // Is self closing
      // If it is an image tag
      if (nodeType === "img") {
        srcAttribute = true
        let selectedSRC = await grabImgSRC(componentArray, relaventIndex)
        if (selectedSRC !== null) {setImgSRCValue(selectedSRC)}
        setOptionsSelector("image")
      } else {
        setOptionsSelector("tag")
      }
    }

    setShowAddTextInput(textBetween)
    setShowImgSRCInput(srcAttribute)
    
    await setCSSObject(componentArray, relaventIndex, path, cssObject, index)

    // Track through the object
    // let track = path.split("/").slice(1)
    // let currentTrack = elementObjectTree
    // let dataFound = ""
    // let dataType = ""

    // // Loop through path to target data
    // for (let i=0;i<track.length;i++) {
    //   // console.log(track[i])
    //   let num = countAsterisks(track[i])
    //   // console.log(num)

    //   function trackData(array) {
    //     let currentTrackCopy = []
    //     // Select the objects with matching names
    //     for (let j=0;j<array.length;j++) {
    //       if (array[j].name === removeAsterisks(track[i])) {
    //         currentTrackCopy.push(currentTrack[j])
    //       }
    //     }
    //     // console.log(currentTrackCopy)
    //     if (currentTrackCopy.length < num) {return null}
    //     else {
    //       // console.log(currentTrack)
    //       if (currentTrackCopy.length === 0) {
    //         // Last node
    //         if (currentTrack[0].children[0].type === "text") {
    //           dataFound = currentTrack[0].children[0].content
    //           dataType = "text"
    //           return true
    //         } else {return false}
    //       } else {
    //         // console.log("MATCHES", currentTrackCopy)
    //         // console.log("MATCH", currentTrackCopy[num])
    //         // console.log("LEAD", currentTrackCopy[num].children)
    //         return currentTrackCopy[num].children
    //       }
    //     }
    //   }

    //   // console.log("CURRENT TRACK", currentTrack)
    //   try {currentTrack = trackData(currentTrack)} catch (error) {console.log(error)}
      
    //   // Data was not found 
    //   if (currentTrack === false) {
    //     break;
    //   } 
    // }
  }

  function removeComments(code) {
    // Use a regular expression to match /* ... */
    const commentRegex = /\/\*[\s\S]*?\*\//g;
    // Remove all occurrences of the matched comments
    const codeWithoutComments = code.replace(commentRegex, '');
    return codeWithoutComments;
  }

  async function setCSSObject(componentArray, relaventIndex, path, cssObject, index) {
    setSelectingLink(false)
    setLinkActive(false)
   
    let aTag = false
    if (removeAsterisks(path.split("/").pop()) === "a") {setShowaTagInput(true); aTag = true}
    else {setShowaTagInput(false)}


    if (cssObject === "") {
      cssObject = currentCSSFileObject
      index = currentComponentIndex
    }
    
    if (componentArray === "" && relaventIndex === "") {
      let file = "";
      try {file = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.js`);
      } catch (error) {console.log(error); }
      if (file === "") {return}
      componentArray = await componentMapped(file);
      relaventIndex = await locateCorrectIndex(componentArray, path)  
    }
    if (removeAsterisks(path.split("/").pop()) === "Link") {
      setCurrentLink(extractLink(componentArray[relaventIndex]).slice(1))
    }
    setCurrentComponentArray(componentArray)
    setCurrentRelaventIndex(relaventIndex)

    function extractURL(inputString) {
      const regex = /href=["'](.*?)["']/g;
      const matches = [];
      let match;
    
      while ((match = regex.exec(inputString)) !== null) {
        matches.push(match[1]);
      }
    
      return matches;
    }

    function extractClassNames(inputString) {
      const regex = /className=["'](.*?)["']/g;
      const matches = [];
      let match;
    
      while ((match = regex.exec(inputString)) !== null) {
        matches.push(match[1]);
      }
    
      return matches;
    }

    function extractIDNames(inputString) {
      const regex = /id=["'](.*?)["']/g;
      const matches = [];
      let match;
    
      while ((match = regex.exec(inputString)) !== null) {
        matches.push(match[1]);
      }
    
      return matches;
    }

    let classes = extractClassNames(componentArray[relaventIndex])
    let ids = extractIDNames(componentArray[relaventIndex])

    let parentClasses = []
    let parentIDs = []
    
    if (path.split("/").length > 2) {
      let parentPath = path.split("/")
      parentPath.pop()
      parentPath = parentPath.join("/")

      // Track through the object
      let track = parentPath.split("/").slice(1)
      let currentTrack = elementObjectTree

      // Loop through path to target data
      for (let i=0;i<track.length;i++) {
        // console.log(track[i])
        let num = countAsterisks(track[i])
        // console.log(num)

        function trackData(array) {
          let currentTrackCopy = []
          // Select the objects with matching names
          for (let j=0;j<array.length;j++) {
            if (array[j].name === removeAsterisks(track[i])) {
              currentTrackCopy.push(currentTrack[j])
            }
          }
          if (currentTrackCopy.length < num) {return null}
          else {
            if (i === track.length - 1) {
              // Last node
              let attrs = currentTrackCopy[num]["attrs"]
              if (Object.keys(attrs).length === 0) {
                return false
              } else {
                let attrsKeys = Object.keys(attrs)
                if (attrsKeys.includes("className")) {
                  let classString = attrs["className"].split(" ")
                  let holder = []
                  for (let j=0;j<classString.length;j++) {holder.push(classString[j])}
                  if (holder.length > 0) {parentClasses.push(holder)}
                }
                if (attrsKeys.includes("id")) {
                  parentIDs.push(attrs["id"])
                }
              }
              return true
            } else {
              let attrs = currentTrackCopy[num]["attrs"]
              if (Object.keys(attrs).length !== 0) {
                let attrsKeys = Object.keys(attrs)
                if (attrsKeys.includes("className")) {
                  let classString = attrs["className"].split(" ")
                  let holder = []
                  for (let j=0;j<classString.length;j++) {holder.push(classString[j])}
                  if (holder.length > 0) {parentClasses.push(holder)}
                }
                if (attrsKeys.includes("id")) {
                  parentIDs.push(attrs["id"])
                }
              }

              return currentTrackCopy[num].children
            }
          }
        }

        try {currentTrack = trackData(currentTrack)} catch (error) {console.log(error)}
      }

      console.log(parentClasses)
      console.log(parentIDs)
    }

    let idsObject = {}
    let classesObject = {}
    let tagName = path.split("/").pop()
 
    // ID Matches
    if (ids.length > 0) {
      ids = ids[0].trim().split(" ")
      for (let i=0;i<ids.length;i++) {
        Object.keys(cssObject).forEach(key => {
          const value = cssObject[key];
          let key1 = removeComments(key).trim()
          if (key1.startsWith("#" + ids[i])) {
            if (key1.startsWith("#" + ids[i] + " ")) {
              idsObject[key] = value
            } else if (key1.startsWith("#" + ids[i] + ":")) {
              idsObject[key] = value
            } else if (key1.length === ids[i].length + 1) {
              idsObject[key] = value
            }
          } 
        });
      }
    }
    
    // Class Matches
    if (classes.length > 0) {
      classes = classes[0].trim().split(" ")
      for (let i=0;i<classes.length;i++) {
        Object.keys(cssObject).forEach(key => {
          const value = cssObject[key];
          let key1 = removeComments(key).trim()
          if (key1.startsWith("." + classes[i])) {
            if (key1.startsWith("." + classes[i] + " ")) {
              classesObject[key] = value
            } else if (key1.startsWith("." + classes[i] + ":")) {
              classesObject[key] = value
            } else if (key1.length === classes[i].length + 1) {
              classesObject[key] = value
            }
          } 
        });
      }
    }

    // Parent ID Matches
    if (parentIDs.length > 0) {
      for (let i=0;i<parentIDs.length;i++) {
        Object.keys(cssObject).forEach(key => {
          const value = cssObject[key];
          let key1 = removeComments(key).trim()
          if (key1.startsWith("#" + parentIDs[i] + " ")) {
            if (key1.length > (2 + parentIDs[i].length)) {
              key1 = key1.slice(2+parentIDs[i].length).trim()
              // Everything after the first match to the parent class
              if (key1 === removeAsterisks(tagName) || key1.startsWith(removeAsterisks(tagName) + " ") || key1.startsWith(removeAsterisks(tagName) + ":")) {
                classesObject[key] = value
              } 
            }
          } 
        });
      }
    }
    
    // Parent Class Matches
    if (parentClasses.length > 0) {
      for (let i=0;i<parentClasses.length;i++) {
        for (let j=0;j<parentClasses[i].length;j++) {
          Object.keys(cssObject).forEach(key => {
            const value = cssObject[key];
            let key1 = removeComments(key).trim()
            if (key1.startsWith("." + parentClasses[i][j] + " ")) {
              if (key1.length > (2 + parentClasses[i][j].length)) {
                key1 = key1.slice(2+parentClasses[i][j].length).trim()
                // Everything after the first match to the parent class
                if (key1 === removeAsterisks(tagName) || key1.startsWith(removeAsterisks(tagName) + " ") || key1.startsWith(removeAsterisks(tagName) + ":")) {
                  classesObject[key] = value
                } 
              }
            } 
          });
        }
      }
    }

    setCurrentCSSIDsObject(idsObject)
    setCurrentCSSClassesObject(classesObject)

    if (aTag) {
      let url = extractURL(componentArray[relaventIndex])
      if (url.length>0) {setaTagInputValue(url[0])}
    }
  }

  async function autoFirstSelect(firstPath, nodeChildren, cssObject, index) {
    // console.log(firstPath)
    // console.log(nodeChildren)
    setCurrentElementPath(firstPath)
    if (nodeChildren && nodeChildren.length > 0)  {
      handleClickedElementFolder(firstPath, cssObject, index)
    } else {
      await handleClickedElementNode(firstPath, cssObject, index)
    }
  }

  // Editing Helpers 
  async function componentMapped(file) {
    // Locate specific part of the file
    function traverseObject(obj) {
      const resultArray = [];

      function explore(node) {
        if (node.name !== undefined) {
          resultArray.push(`<${node.name}`); // Opening tag
        }

        // if (node.attrs !== undefined) {
        //   if (node.attrs.className !== undefined ) {
        //     resultArray.push(` className=`)
        //     resultArray.push(node.attrs.className)
        //   }
        // }

        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            explore(child);
          }
        }
        
        // Add closing tags unless not a self closing tab
        if (node.name !== undefined && !possibleSelfClosing.includes("<" + node.name) && !node.voidElement) {
          resultArray.push(`</${node.name}>`); 
        }
      }

      explore(obj);

      return resultArray;
    }

    let representation = [];
    console.log(elementObjectTree)
    for (let i = 0; i < elementObjectTree.length; i++) {
      let currentArray = traverseObject(elementObjectTree[i]);
      for (let j = 0; j < currentArray.length; j++) {
        representation.push(currentArray[j]);
      }
    }
    console.log("Representation", representation)

    // Now go through array and map to code using REGEX
    function extractCode(array1, fullCode) {
      let results = []
      let code = fullCode
      let array = array1
      array.push(`export default`)
      for (let i=0;i<array.length;i++) {
        function pattern1(inputString, find) {
          const pattern = new RegExp(`${find}`);
          const match = inputString.match(pattern);
        
          if (match) {
            const startIndex = match.index + match[0].length;
            const followingText = inputString.slice(startIndex);
            return followingText;
          } else {
            return inputString;
          }
        }
          
        function pattern2(inputString, find) {
          const pattern = new RegExp(`${find}`);
          const match = inputString.match(pattern);
        
          if (match) {
            const endIndex = match.index;
            const precedingText = inputString.slice(0, endIndex);
            return precedingText;
          } else {
            return inputString;
          }
        }
        // console.log("LOOP")
        // console.log("")

        if (i === 0) {
          let firstSnippet = pattern2(code, array[i])
          results.push(firstSnippet)
        }

        // Grab everything between matches and appended with name of current match
        let allAfter = pattern1(code, array[i])
        console.log(allAfter)

        let inBetween = pattern2(allAfter, array[i+1])
        console.log(inBetween)

        let string = array[i] + inBetween
        results.push(string)
        console.log(results)
        // Extract everything after the first 
        let updatedCode = pattern1(allAfter, array[i+1])
        code = array[i+1] + updatedCode  
        console.log(code)
        
      }

      return results 
    }
    
    const resultArray = extractCode(representation, file);
    console.log(resultArray)
    for (let result in resultArray) {console.log(resultArray[result])}
    return resultArray
  }

  // async function componentMappedForClosing(file) {
  //   let closingIndex = null
  //   let currentPath = currentElementPath
  //   currentPath = currentPath.split("/").slice(1)
  //   console.log(currentPath)
  //   // Locate specific part of the file
  //   function traverseObject(obj, correctIndex) {
  //     const resultArray = [];

  //     function explore(node) {
  //       let found = false
  //       if (node.name !== undefined) {
  //         resultArray.push(`<${node.name}`); // Opening tag
  //         console.log(`<${node.name}>`)
  //       }

  //       if (node.children && node.children.length > 0) {
  //         for (const child of node.children) {
  //           explore(child);
  //         }
  //       }
        
  //       // Add closing tags unless not a self closing tab
  //       if (node.name !== undefined && !possibleSelfClosing.includes("<" + node.name)) {
  //         resultArray.push(`</${node.name}>`); 
  //         console.log(`</${node.name}>`)
  //       }
  //     }

  //     let found = false
  //     function explore2(node) {
  //       if (node.name !== undefined) {
  //         resultArray.push(`<${node.name}`); // Opening tag
  //         console.log(`<${node.name}>`)
  //       }
  //       console.log(currentPath)
  //       let count = 0
  //       let num = countAsterisks(currentPath[0])

  //       if (node.children && node.children.length > 0) {
  //         for (const child of node.children) {
  //           console.log("child", child.name)
  //           if (child.name === removeAsterisks(currentPath[0])) {
  //             count += 1
  //             if (num === count -1) {
  //               if (currentPath.length > 1) {
  //                 currentPath = currentPath.slice(1)
  //                 explore2(child)
  //               } else {
  //                 console.log("Found!!!")
  //                 found = true; 
  //                 explore(child)}
  //             } else {explore2(child)};
  //           } else {explore2(child)}
  //         }
  //       }
        
  //       // Add closing tags unless not a self closing tab
  //       if (node.name !== undefined && !possibleSelfClosing.includes("<" + node.name)) {
  //         console.log(`</${node.name}>`)
  //         if (found) {console.log(resultArray.length)}
  //         resultArray.push(`</${node.name}>`); 
  //       }
  //     }

  //     if (correctIndex) {
  //       console.log("correct start")
  //       currentPath = currentPath.slice(1)
  //       explore2(obj);
  //     } else {explore(obj)}

  //     return resultArray;
  //   }

  //   let representation = [];
  //   for (let i = 0; i < elementObjectTree.length; i++) {
  //     let num = countAsterisks(currentPath[0])
  //     let count = 0
  //     if (elementObjectTree[i].name === removeAsterisks(currentPath[0])) {count += 1}
  //     let currentArray = ""
  //     if (num === count - 1) {currentArray = traverseObject(elementObjectTree[i], true);}
  //     else {currentArray = traverseObject(elementObjectTree[i], false);}
  //     for (let j = 0; j < currentArray.length; j++) {
  //       representation.push(currentArray[j]);
  //     }
  //   }

  //   console.log("Representation", representation)
  //   return closingIndex
  // }

  async function locateCorrectIndex(componentArray, path) {
    let editedArray = componentArray

    // Use the path to determine where to edit within the array
    let cleanElementPath = path.split("/").slice(1)
    // console.log(cleanElementPath)

    // Move through array to search for location
    let foundIndex = null
    let countFound = 0
    let lookingForOpening = true
    for (let j=0;j<editedArray.length;j++) {
      // console.log(editedArray[j])
      let currentStep = cleanElementPath[0]
      let num = countAsterisks(currentStep)
      if (lookingForOpening) {
        if (editedArray[j].includes(`<${removeAsterisks(currentStep)}`)) {
          countFound += 1
          if (countFound - 1 === num) {
            // Found -> move path forward
            // console.log("movingForward")
            if (cleanElementPath.length === 1) { 
              // Found Data
              // console.log("FOUND", editedArray[j])
              foundIndex = j
            } else {
              cleanElementPath = cleanElementPath.slice(1)
              countFound = 0
            }
          } else {
            // Look for closing tag and 
            let possibleSelfClosing = [`<area`,
              `<base`,
              `<br`,
              `<col`,
              `<embed`,
              `<hr`,
              `<img`,
              `<input`,
              `<link`,
              `<meta`,
              `<param`,
              `<source`,
              `<track`,
              `<wbr`,
              `<command`, 
              `<keygen`, 
              `<menuitem`, 
              `<frame` ]
            if (possibleSelfClosing.includes(currentStep)) {
              // Self Closing

            } else {
              lookingForOpening = false
            }
          }
        } 
      } else {
        if (editedArray[j].includes(`</${removeAsterisks(currentStep)}`)) {
          lookingForOpening = true
        }
      }
    }

    return foundIndex
  }

  async function grabTextData(componentArray, relaventIndex) {
      let splits = componentArray[relaventIndex].split(">")
      let value = splits[splits.length - 1]
      return value
  }

  async function editTextData(componentArray, relaventIndex) {
    let splits = componentArray[relaventIndex].split(">")
    splits[splits.length - 1] = cssTextValue
    componentArray[relaventIndex] = splits.join(">")
    return componentArray
  }

  function reassembleCode(editedArray) {
    let alteredCode = ""
    for (let k=0;k<editedArray.length;k++) {
      alteredCode += editedArray[k]
    }
    return alteredCode
  }

  async function expandElementTree() {
    // Update element object trees
    let createdTree = await handleCreateElementTree(currentComponentIndex, false, {})
    
    // Set element tree to full open
    function getAllPaths(obj, currentPath = '') {
      let paths = [];
    
      for (let key in obj) {
        let newPath = currentPath ? `${currentPath}/${key}` : key;
    
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // If the current value is an object, recursively call the function
          paths.push(newPath);
          paths = paths.concat(getAllPaths(obj[key], newPath));
        } else {
          // If it's a leaf node (non-object), add the path to the array
          paths.push(newPath);
        }
      }
    
      return paths;
    }
    let pushObject = {}
    let paths = getAllPaths(createdTree)
    for (let j=0;j<paths.length;j++) {
      pushObject[paths[j]] = true
    }
    setExpandedElementNodes(pushObject)
  }

  // Image Helpers 
  async function grabImgSRC(componentArray, relaventIndex) {
    let splits = componentArray[relaventIndex].split(" ")
    let value = null
    for (let i=0;i<splits.length;i++) {
      if (splits[i].includes("src=")) {
        value = splits[i].slice(5, -1)
      }
    }
    return value
  }

  function editImgSRC(componentArray, relaventIndex, newText) {
    console.log(componentArray)
    let replacement = newText !== ""? newText : imgSRCValue

    let currentLine = componentArray[relaventIndex]
    if (currentLine.includes('src="')) {
      let split = currentLine.split('"')
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes('src=')) {
          split[foundIndex + 1] = replacement
          console.log(split)
          componentArray[relaventIndex] = split.join('"')
          break;
        }
      }
    } else if (currentLine.includes("src='")) {
      let split = currentLine.split("'")
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes("src=")) {
          split[foundIndex + 1] = replacement
          componentArray[relaventIndex] = split.join("'")
          break;
        }
      }
    } 
    console.log(componentArray)
    return componentArray

    // let splits = componentArray[relaventIndex].split(" ")
    // let foundIndex = null
    // for (let i=0;i<splits.length;i++) {
    //   if (splits[i].includes("src=")) {
    //     foundIndex = i;
    //     break;
    //   }
    // }
    // if (foundIndex !== null) {
    //   splits[foundIndex] = `src="` + replacement + `"`
    //   componentArray[relaventIndex] = splits.join(" ")
    // }
    // return componentArray
  }

  function editaTag(componentArray, relaventIndex) {
    let replacement = aTagInputValue
    let currentLine = componentArray[relaventIndex]
    if (currentLine.includes('href="')) {
      let split = currentLine.split('"')
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes('href=')) {
          split[foundIndex + 1] = replacement
          componentArray[relaventIndex] = split.join('"')
          break;
        }
      }
    } else if (currentLine.includes("href='")) {
      let split = currentLine.split("'")
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes("href=")) {
          split[foundIndex + 1] = replacement
          componentArray[relaventIndex] = split.join("'")
          break;
        }
      }
    } 
    return componentArray
  }

  function editLinkTag(componentArray, relaventIndex) {
    let replacement = currentLink
    let currentLine = componentArray[relaventIndex]
    if (currentLine.includes('to="')) {
      let split = currentLine.split('"')
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes('to=')) {
          split[foundIndex + 1] = "/" + replacement
          componentArray[relaventIndex] = split.join('"')
          break;
        }
      }
    } else if (currentLine.includes("to='")) {
      let split = currentLine.split("'")
      console.log(split)
      let foundIndex = null
      for (let i=0;i<split.length;i++) {
        if (split[i].includes("to=")) {
          split[foundIndex + 1] = "/" + replacement
          componentArray[relaventIndex] = split.join("'")
          break;
        }
      }
    } 
    return componentArray
  }

  function addLinkTag(componentArray, relaventIndex) {
    let line1 = `<Link to="/` + currentLinkChoice + `">\n`
    let line2 = `</Link>\n`

    // If self closing
    if (componentArray[relaventIndex].trim().startsWith("<") && componentArray[relaventIndex].trim().endsWith("/>")) {
      componentArray[relaventIndex] = line1 + componentArray[relaventIndex] + line2
      return componentArray
    }

    let count = 0
    let subArray = componentArray.slice(relaventIndex) 
    let closingIndex = null
    for (let i=0;i<subArray.length;i++) {
      if (subArray[i].includes("<") && subArray[i].includes("/>")) {continue}
      if (!subArray[i].startsWith("</")) {count += 1}
      else {count -= 1}
      if (count === 0) {
        closingIndex = relaventIndex + i
        break
      }
    }

    if (closingIndex === null) {return componentArray}
    else {
      let newArray = []
      for (let i=0;i<componentArray.length;i++) {
        if (i === relaventIndex) {newArray.push(line1)}
        if (i === componentArray.length - 2 && i === closingIndex) {
          console.log("special case, full component linked")
          let line = componentArray[i].split(">")
          let newLine = line[0] + ">\n</Link>\n" + line.slice(1).join(">") 
          newArray.push(newLine)
        } else {
          newArray.push(componentArray[i])
          if (i === closingIndex) {newArray.push(line2)}
        }
      }
      return newArray
    }
  }

  function addaTag(componentArray, relaventIndex) {
    let line1 = `<a href="` + selectingaTagInputValue + `">\n`
    let line2 = `</a>\n`

     // If self closing
     if (componentArray[relaventIndex].trim().startsWith("<") && componentArray[relaventIndex].trim().endsWith("/>")) {
      componentArray[relaventIndex] = line1 + componentArray[relaventIndex] + line2
      return componentArray
    }

    let count = 0
    let subArray = componentArray.slice(relaventIndex) 
    let closingIndex = null
    for (let i=0;i<subArray.length;i++) {
      if (subArray[i].includes("<") && subArray[i].includes("/>")) {continue}
      if (!subArray[i].startsWith("</")) {count += 1}
      else {count -= 1}
      if (count === 0) {
        closingIndex = relaventIndex + i
        break
      }
    }

    if (closingIndex === null) {return componentArray}
    else {
      let newArray = []
      for (let i=0;i<componentArray.length;i++) {
        if (i === relaventIndex) {newArray.push(line1)}
        if (i === componentArray.length - 2 && i === closingIndex) {
          console.log("special case, full component linked")
          let line = componentArray[i].split(">")
          let newLine = line[0] + ">\n</a>\n" + line.slice(1).join(">") 
          newArray.push(newLine)
        } else {
          newArray.push(componentArray[i])
          if (i === closingIndex) {newArray.push(line2)}
        }
      }
      return newArray
    }
  }


  // FILE TREE
  const [tree, setTree] = useState({ "React Project": {}  })

  const [expandedNodes, setExpandedNodes] = useState({});
  
  const handleToggle = (nodePath) => {
    setExpandedNodes((prevState) => ({
      ...prevState,
      [nodePath]: !prevState[nodePath],
    }));
  };
  
  const renderTreeNode = (node, path) => {
    console.log(path)
    if (typeof node !== 'object' || node === true) {
      // Render a file node
      return <div className="tree-item" onClick={()=>{handleFileOpen(path)}} style={{color: "white", marginBottom: "3px", paddingBottom: "2px", borderBottom: "0.3px solid #888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: "unset"}} key={path}>{path.split('/').pop()}</div>; 
    }

    // Render a folder node
    let root = false
    let isExpanded = expandedNodes[path] || false;
    if (!path.includes("/")) { isExpanded = true; root = true }
    
    return (
      <div key={path}>
        <div className={root? "" : "tree-item"} style={{overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", borderBottom: "0.3px solid #888", marginBottom: "3px", paddingBottom: "2px", fontFamily: "unset", color: root? "#999" : "white", marginLeft: root? "5px" : 0, cursor: root? "auto" : "pointer"}}  onClick={() => handleToggle(path)}>
          {root? <></> : isExpanded ? <BsChevronDown color="white" size={12} /> : <BsChevronDown style={{transform: "rotate(-90deg)"}} color="white" size={12} />} {path.split('/').pop()} {/* Display only the folder name */}
        </div>
        {isExpanded && (
          <div className="nested-tree" style={{ marginLeft: 14}}>
            {Object.entries(node).map(([nodeName, nestedNode]) =>
              renderTreeNode(nestedNode, `${path}/${nodeName}`)
            )}
          </div>
        )}
      </div>
    );
  };
  
  async function retrieveFilePaths2() {
    return new Promise(async (resolve, reject) => {
      const db = await openDatabase(); // Open or create the database
      const transaction = db.transaction('files', 'readonly');
      const objectStore = transaction.objectStore('files');
  
      // Get Count
      let fileCount = 37000;
      let number = 0;
      const countRequest = objectStore.count();
      countRequest.onsuccess = async event => {
        fileCount = event.target.result;
      };
  
      // Retrieve all files
      const request = objectStore.openCursor(); // Use a cursor instead of getAllKeys()
      const progressInterval = 1200; 
      let lastUpdateTime = Date.now();
  
      const processedFiles = [];
      let ranOneTime = false

      request.onsuccess = event => {
        if (!ranOneTime) {
          setWarningText1("Creating New Project...")
          setDisplayWarningProgress(true)
          ranOneTime = true
        }

        const cursor = event.target.result;
        if (cursor) {
          processedFiles.push(cursor.key);
          number++;
  
          // Update progress every 'progressInterval' milliseconds
          const currentTime = Date.now();
          if (currentTime - lastUpdateTime >= progressInterval) {
            const progress = (number / fileCount) * 100;
            setStoringProgress(progress)
            // console.log(`Progress: ${progress.toFixed(2)}%`);
            lastUpdateTime = currentTime;
          }
  
          // Move to the next item
          cursor.continue();
        } else {
          // All files have been processed
          resolve(processedFiles);
        }
      };
  
      request.onerror = event => {
        reject('Error retrieving files');
      };
    });
  }

  // EDITOR FUNCTIONS 
  const decorationIdsRef = useRef([]);
  const handleCursorPositionChange = () => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        const startLineNumber = selection.startLineNumber;

        // Remove previous decorations using the decorationIdsRef.current
        editor.deltaDecorations(decorationIdsRef.current, []);

        // Add a new decoration
        const newDecoration = {
          range: new monacoObject.Range(startLineNumber, 1, startLineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'line-bar-decoration',
          },
        };

        // Apply the new decoration and update decorationIdsRef.current
        const newDecorationIds = editor.deltaDecorations([], [newDecoration]);
        decorationIdsRef.current = newDecorationIds;

        // Perform any other actions you need to do for the new cursor position
        setLinePosition({ startLineNumber: startLineNumber - 1, column: 1 });
        setLineEditOperation({
          range: new monacoObject.Range(startLineNumber, 0, startLineNumber, 0),
          text: '/* Insert AI generated code */\n',
          forceMoveMarkers: true,
        });
      }
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const disposable = editor.onDidChangeCursorSelection(handleCursorPositionChange);
      try {monacoAutoformat()} catch (error) {console.log(error)}
      return () => {
        disposable.dispose();
      };
    }
  }, [editorRef.current]);

  let blankSlate = false;

  function setPagesList(copy) {
    setPageNames(copy)
  }

  async function gitComponents() {
    console.log("getting gitComponents")
    // Grab git components
    // Retrieve code
    const git_user = "josephgoff-git";
    const git_repo = "components";
    const branch = "master";
    // const proxyUrl = 'http://localhost:3001/github-proxy';
    // const proxyUrl = 'https://reactaiserver.azurewebsites.net/github-proxy';
    const proxyUrl = `${server}/github-proxy`;
    
    const githubApiUrl = `https://api.github.com/repos/${git_user}/${git_repo}/zipball/${branch}`;
  
    let componentDataCopy = componentData

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
        } else {
          let pieces = file.name.split("/")
          let folderName = pieces[1]
          let componentName = pieces[2]

          let found = false
          for (let i=0;i<componentDataCopy.length;i++) {
            if (componentDataCopy[i][0] === folderName) {
              found = true; 
              let found2 = false
              for (let j=0;j<componentDataCopy[i][1].length;j++) {
                if (componentDataCopy[i][1][j].component === componentName) {
                  found2 = true; 
                }
              } 
              if (!found2) {
                componentDataCopy[i][1].push({component: componentName})
              }
            }
          } 
          if (!found) {
            componentDataCopy.push([folderName, [{component: componentName}]])
          }

          let blob = await file.async('blob');
          const fileName = file.name.replace(/^[^/]+\//, 'react-app/');
          const fileType = blob.type;
          const fileName1 = fileName.split('/').pop();

          let parts = fileName.split('/');
          parts[1] = "src/components";
          parts[2] = componentName
          parts[3] = componentName + "." + parts[3].split(".")[1]
          let newFileName = parts.join('/');

          const fileObject = {
              blob,
              name: fileName1,
              type: fileType,
              webkitRelativePath: newFileName,
          };
          filesArray.push(fileObject);
        }
        process += 1;

      }

      console.log(componentDataCopy)
      let restructuredArray = []
      let order = ["Navbars", "Heros", "Displays", "Images", "Footers"]
      for (let i=0;i<order.length;i++) {
        for (let j=0;j<componentDataCopy.length;j++) {
          if (componentDataCopy[j][0] === order[i]) {
            restructuredArray.push(componentData[j])
          }
        }
      }
      console.log(restructuredArray)
      setComponentData(restructuredArray.reverse())
    } catch(error) {console.log(error)}
  }

  async function handleEditorDidMount(editor, monaco) {
    await gitComponents();

    console.log("First Build: ", firstBuild)
    if (firstBuild) {setWarning(true)}
    
    // First Build
    const projectName = await handleBuild(); 
    
    // Once done building, open up App.js if it exists
    if (!clickedNewApp) {
      let appjs = null;
      try {appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
      } catch {appjs = null}
      if (appjs !== null) {
        await handleFileOpen(`${projectTitle}/src/App.js`)
      }
    }

    // let decorationIds = [];
    editorRef.current = editor;

    setEditorObject(editor)
    setMonacoObject(monaco)
  }

  async function moneyyy(event) {
    const money = await handleSubmit(event);
  }

  function extractCode(string) {
    const codeRegex = /```jsx([\s\S]*)```/;
    const matches = string.match(codeRegex);
  
    if (matches && matches.length >= 2) {
      return matches[1].trim();
    }
    
    return string;
  }
  
  // AI GENERATION FUNCTIONS 
  async function handleSubmit(e) {
    let currentComponent = selectedBuildComponent;
    let currentFile = null
    try {currentFile = file} catch (error) {console.log(error)}

    let isComponentFile = false
    let currentCode = ""
      try {
      if (currentComponent !== "") {
        isComponentFile = true
        currentCode = await retrieveFileByPath(`${projectTitle}/src/components/${currentComponent}/${currentComponent}.js`)
      } else if (currentFile !== "") {
        currentCode = await retrieveFileByPath(file.path)
      } 
    } catch(error) {
      console.log(error)
      return 
    }

    console.log(currentCode)

    e.preventDefault();

    // Check that there is a prompt
    if (prompt.length === 0) {
      giveWarning("Please Enter a Prompt", "The AI requires instructions to generate code...", "Self Close")
      return
    }
  
    // Check that there is a line selected
    if (Object.keys(lineEditOperation).length === 0 && AIMode === "ADD") {
      giveWarning("Please Select a Line", "ADD mode requires a specific location...", "Self Close")
      return
    }

    // Loading response animation
    setIsSubmitting(true)
    const container = document.getElementById("lottie-container-1"); 
    if (container) {
      const animation = lottie.loadAnimation({
        container: container,
        animationData: animationData1, 
        renderer: 'svg', 
        loop: true,
        autoplay: true, 
      });
    }

    setEditorCurrent(editorRef.current.getValue())
    
    const addCodeAtLineNumber = () => {
      if (editorRef.current) {
        const editOperation = lineEditOperation
        editorRef.current.executeEdits('addCode', [editOperation]);
      }
    };

    if (AIMode === "ADD") {
      addCodeAtLineNumber()
      setOriginalFile(editorRef.current.getValue())
    }

    // Create a full prompt for the AI
    let userMessage = "";
    if (AIMode === "ADD") {
      userMessage = "Here is a jsx file from my React project. Please locate this comment in code that says exactly: {/* Insert  AI generated code */}, and then return to me a snippet of code meant to replace that coment based on these instructions: Add "
      + prompt 
      + ". Please don't return the entire file. Only return the code to replace that comment! Make sure your response only contains code and nothing else. Here is the jsx file: \n\n" 
      + currentCode
    } else if (AIMode === "ALTER") {
      // userMessage = prompt 
      // + ". Return the FULL jsx code for the file back to me. Here's the jsx file: " 
      // + editorRef.current.getValue()
      userMessage = "Here is a jsx component: Please do this: '"
      + prompt 
      + "'. Return the FULL jsx code for the file back to me. For any CSS you write, write the css inline directly inside the tags. You will return the full code for one file. Here's the file currently, please don't remove the classnames and ids because the file is using a css file currently: " 
      + currentCode
    } 
    
    setIsLoading(true);

    // Wait for AI return messages and replace code in editor 
    const requests = [
      getMessage([{ text: userMessage, isBot: false }]),
      // getMessage([{ text: userMessage, isBot: false }]),
      // getMessage([{ text: userMessage, isBot: false }]),
      // getMessage([{ text: userMessage, isBot: false }])
    ];

    try {
      let editorCode = editorRef.current.getValue()
      const results = await Promise.all(requests);
      let AIArray = [];
      for (let i=0;i<requests.length;i++) {
        let response = results[i]
        if (AIMode === "ALTER") {response = extractCode(response)}
        let newContent = "";
        if (AIMode === "ADD") {newContent = findAndReplace(editorCode, response)}
        if (AIMode === "ALTER") {newContent = response}
        console.log("AI ARRAY VAL:", newContent)
        AIArray.push(newContent)
        if (i === 0) {
          let openFilesCopy = openFiles
          if (currentComponent !== "") {
            console.log("storing 1")

            // Verify that file contains style link
            if (isComponentFile) {
              const lines = newContent.split('\n');
              // const modifiedLines = lines.filter(line => !line.trim().startsWith(`import ${componentName}`));
              let needsImport = true
              for (let i=0;i<lines.length;i++) {
                if (lines[i].includes(`import "./${currentComponent}.css"`) || lines[i].includes(`import './${currentComponent}.css'`)) {
                  needsImport = false
                }
              }

              if (needsImport) {
                newContent = `import "./${currentComponent}.css"\n` + newContent
              }
              // const modifiedString = modifiedLines.join('\n');
            }


            await storeFile(`${projectTitle}/src/components/${currentComponent}/${currentComponent}.js`, newContent)
            // Refresh files by closing all 
            setOpenFiles([])
            setFile({})
            setOpenFileNum(null)
            setLastEdited(`${projectTitle}/src/components/${currentComponent}/${currentComponent}.js`)
            
            let newOpenFiles = []
            async function openAfterSubmit(path) {
              let fileData = await retrieveFileByPath(path)
            
              // Open file
              let fileNames = path.split("/")
              let fileName = fileNames[fileNames.length - 1]
              let fileType = fileName.split(".")
              let type = "javascript";
              if (fileType[1] === "html") {type="html"}
              if (fileType[1] === "js") {type="javascript"}
              if (fileType[1] === "jsx") {type="javascript"}
              if (fileType[1] === "ts") {type="typescript"}
              if (fileType[1] === "css") {type="css"}
              if (fileType[1] === "json") {type="json"}

              newOpenFiles.push({
                name: fileName,
                language: type,
                value: fileData,
                path: path })
              setRefreshCount(refreshCount + 1)
              setFile({
                name: fileName,
                language: type,
                value: fileData,
                path: path
              })
              setOpenFileNum(0)
            } 
  
            for (let k=0;k<openFilesCopy.length;k++) {
              try {
                await openAfterSubmit(openFilesCopy[k].path)
              } catch(error) {console.log(error)}
            }
            setOpenFiles(newOpenFiles)
            setCurrentFrame(1)
            
      
          
          } else {
            if (currentFile !== null) {
              await storeFile(currentFile.path, newContent)
              // Refresh files by closing all 
              setOpenFiles([])
              setFile({})
              setOpenFileNum(null)
              setLastEdited(currentFile.path)
              
              let newOpenFiles = []
              async function openAfterSubmit(path) {
                let fileData = await retrieveFileByPath(path)
              
                // Open file
                let fileNames = path.split("/")
                let fileName = fileNames[fileNames.length - 1]
                let fileType = fileName.split(".")
                let type = "javascript";
                if (fileType[1] === "html") {type="html"}
                if (fileType[1] === "js") {type="javascript"}
                if (fileType[1] === "jsx") {type="javascript"}
                if (fileType[1] === "ts") {type="typescript"}
                if (fileType[1] === "css") {type="css"}
                if (fileType[1] === "json") {type="json"}
  
                newOpenFiles.push({
                  name: fileName,
                  language: type,
                  value: fileData,
                  path: path })
                setRefreshCount(refreshCount + 1)
                setFile({
                  name: fileName,
                  language: type,
                  value: fileData,
                  path: path
                })
                setOpenFileNum(0)
              } 
    
              for (let k=0;k<openFilesCopy.length;k++) {
                try {
                  await openAfterSubmit(openFilesCopy[k].path)
                } catch(error) {console.log(error)}
              }
              setOpenFiles(newOpenFiles)
              setCurrentFrame(1)
              
            }
          }
          
        }
      }
      setAIResults(AIArray)
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsSubmitting(false)
    }

    // Back Space
    // editorRef.current.setValue(newContent);
    // let editOperations = [{
    //   range: editorRef.current.getModel().getFullModelRange(),
    //   text: botMessage,
    // }];

    // editorRef.current.executeEdits("my-source", editOperations);
    // editorRef.current.pushUndoStop();
    // editorRef.current.setValue(botMessage)

    // let editOperations = [{
    //   range: editor.getModel().getFullModelRange(),
    //   text: botMessage,
    // }];

    // editor.executeEdits("my-source", editOperations);
    // editor.pushUndoStop();

    // Auto reformat the new code
    monacoAutoformat()
    const moneyyy = await handleBuild(); 
    setHasRunOnce(true)
  };
  
  async function getMessage(messages) {
    // const proxyUrl = 'http://localhost:3001/gpt-message-editor';
    // const proxyUrl = 'https://reactaiserver.azurewebsites.net/gpt-message-editor';
    const proxyUrl = `${server}/gpt-message-editor`
    try {
      const response = await axios.post(proxyUrl, { message: messages, gpt: "3.5-turbo", temperature: modelTemperature});
      return response.data
    } catch (error) {
      return 'Something went wrong...'
    }
  }

  function findAndReplace(code, replacement) {
    const regex = /\/\*\s*Insert\s*AI\s*generated\s*code\s*\*\/\s*/;
    const updatedCode = code.replace(regex, replacement + "\n");
    return updatedCode;
  }

  function monacoAutoformat() {
    const formatAction = editorObject.getAction('editor.action.formatDocument');
    const autoFormatCode = () => {
      if (formatAction) {formatAction.run()}
    };
    autoFormatCode();
    editorObject.addCommand(monacoObject.KeyMod.CtrlCmd | monacoObject.KeyCode.KEY_F, autoFormatCode);
    editorObject.addCommand(monacoObject.KeyMod.Shift | monacoObject.KeyMod.Alt | monacoObject.KeyCode.KEY_F, autoFormatCode);
  }

  async function askGPT(prompt) {
    if (prompt.length === 0) return null
    try {
      return await getMessage([{ text: prompt, isBot: false }])
    } catch (error) {
      console.log("Error getting message");
      return null
    }
  }

  // BUILD FUNCTION
  const handleBuild = async (appJSCode) => {
    try {
      // restore the stack
      try {
        let appJS = ""
        if (typeof appJSCode === "string") {
          appJS = appJSCode
          console.log(appJS)
        }
        else {
          appJS = await retrieveFileByPath(`${projectTitle}/src/App.js`);
        }
      } catch (error) {
        console.log(error)
      }

      console.log("getting file paths")
      let filePaths = await retrieveFilePaths()
      if (firstBuild) {
        setWarning(true)
        filePaths = await retrieveFilePaths2()
      } else {filePaths = await retrieveFilePaths();}
      console.log("got file paths")
      console.log(filePaths)
      let fileTree = await retrieveFileTree();
      console.log("got file tree")
      console.log(fileTree)
      let projectName = filePaths[0].split("/")[0];

      if (firstBuild || blankSlate) {
        let packageJson = await retrieveFileByPath(`${projectTitle}/package.json`);
        let packageDependencies = JSON.parse(packageJson).dependencies;
        let packageQueue = Object.entries(packageDependencies)
        let packageData = {}

        let step = 0;
        while (packageQueue.length) {
          let [packageName, packageVersion] = packageQueue.pop();
          if (packageName in (fileTree[projectName]['node_modules'] || {})) {
            console.log(`${packageName} is already installed, skipping...`)
            continue
          }
          if (packageName in packageData) { continue }
          if (packageName === 'react-scripts') { continue }
        
          step += 1
          // if (step % 2 === 0 && blankSlate) {
            setStoringProgress((step/18) * 100)
          // }
          console.log(`Fetching package data for ${packageName}...`);
          let response = await fetch(`https://registry.npmjs.org/${packageName}`);
          let data = await response.json();
          let versions = Object.keys(data.versions);
          let version = semver.maxSatisfying(versions, packageVersion);
        
          packageData[packageName] = data.versions[version];
          let dependencies = data.versions[version].dependencies;
          for (let dependency in dependencies) {
        packageQueue.push([dependency, dependencies[dependency]])
          }
        }
        
        for (let packageName in packageData) {
          step += 1
          setStoringProgress((step/18) * 100)
          console.log(`Installing ${packageName}`)
          let tarballURL = packageData[packageName].dist.tarball;
          let packageFiles = await fetch(tarballURL)
        .then(stream => stream.body.pipeThrough(new window.DecompressionStream("gzip")))
        .then(stream => new Response(stream).arrayBuffer())
        .then(stream => untar(stream));
        
          for (let file of packageFiles) {
        let path = file.name.replace(/^package\//, `${projectName}/node_modules/${packageName}/`);
        if (!path.startsWith(`${projectName}`)) {path = `${projectName}/node_modules/` + path}
        await storeFile(path, file.blob);
          }
        }
      }


      // let packageJsons = filePaths.filter(x => x.startsWith(`${projectName}/node_modules/`) && x.endsWith('/package.json')).slice(0, 10);
      // console.log(`Parsing ${packageJsons.length} package.json files`);
      
      // let mainFilePaths = [];
      // for (let packageJson of packageJsons) {
      //   let modulePath = path.dirname(packageJson);
      //   let module = modulePath.slice(`${projectName}/node_modules/`.length)
      //   try {
      //     let packageJsonData = await retrieveFileByPath(packageJson);
      //     let mainPath = JSON.parse(packageJsonData).main;
      //     if (!mainPath) {
      //       continue;
      //     }
      //     try {
      //       let mainAbsPath = path.join(modulePath, mainPath);
      //       mainAbsPath = await resolvePath(fileTree, mainAbsPath);
      //       await retrieveFileByPath(mainAbsPath)
      //       mainFilePaths.push(mainAbsPath)
      //     } catch {
      //       console.log(`Couldn't find main file at ${path.join(modulePath, mainPath)} for module ${module}, skipping...`);
      //       continue;
      //     }
      //   } catch {
      //     console.log(`Couldn't find package.json for module ${module}, skipping...`);
      //     continue;
      //   }
      // };

      // console.log("Done scanning package.json files")

      let reactRegex = /import\s+React(?:\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\})?\s+from\s+['"]react['"]/;

      let srcFiles = filePaths.filter(x => x.startsWith(`${projectName}/src/`) && (x.endsWith('.js') || x.endsWith('.jsx')));
      let modules = [];
      for (let filePath of srcFiles) {
        let fileData = await retrieveFileByPath(filePath)
        let moduleCode =  Babel.transform(fileData, { presets: [["env", {"modules": false}], "react"] }).code;
        if (!reactRegex.test(moduleCode)) {
          moduleCode = 'import React from "react";\n' + moduleCode;
        }
        modules.push({
          name: filePath,
          code: moduleCode,
          isEntry: filePath === `${projectName}/src/index.js`
        });
      }

      let moduleById = {};
      modules.forEach(module => {
        moduleById[module.name] = module;
      });

      let inputOptions = {
        input: [`${projectName}/src/index.js`],
        plugins: [{
          resolveId (importee, importer) {
            // console.log("IMPORTING FILE", importer, importee);
            let fileType = importee.split('.').slice(-1)[0];
            if (!importer) return importee;
            if (importee in moduleById) return importee;
            if (importee[0] !== '.') return false;
            if (fileType in staticFileTypes) return false;

            let filePath = path.join(path.dirname(importer), importee);
            let resolved = resolvePath(fileTree, filePath);
            if (!(resolved in moduleById)) {
              throw new Error(`Could not resolve '${importee}' from '${importer}'`);
            }
            return resolved;
          },
          load: function (id) {
            return moduleById[id].code;
          }
        }],
      }

      let rolledUp = await rollup.rollup(inputOptions);
      let bundle = await rolledUp.generate({});
      let bundleCode = bundle.output[0].code;
      // console.log("BUNDLE");
      // console.log(bundle.output[0]);
      // console.log(bundle.output[0].code);

      let staticDependencies = {}
      let bundleDependencies = {}
      for (let name of bundle.output[0].imports) {
        let fileType = name.split('.').slice(-1)[0]
        if (fileType in staticFileTypes) {
          staticDependencies[name] = { type: fileType };
        }
        else {
          let modulePath = await resolvePackage(fileTree, path.join(projectName, 'node_modules', name));
          bundleDependencies[modulePath] = [name];
        }
      };
  
      let dependencies = {};
      for (let key in bundleDependencies) {
        dependencies[key] = [...bundleDependencies[key]];
      }
      let dependencyQueue = Object.keys(dependencies);
      while (dependencyQueue.length) {
        let fileName = dependencyQueue.shift();
        let contents = await retrieveFileByPath(fileName);
        let regexp = /require\(['"](.+?)['"]\)/g
        let results = contents.matchAll(regexp);
        for (let result of results) {
          let requirePath;
          try {
            // Check if the dependency is a node submodule (local node_modules)
            requirePath = path.join(path.dirname(fileName), result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          } catch {
            // Fall back to the top-level node_modules
            requirePath = path.join(projectName, 'node_modules', result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          }
          if (!(requirePath in dependencies)) {
            dependencyQueue.push(requirePath);
            dependencies[requirePath] = [];
          }
          dependencies[requirePath].push(result[1]);
        }
      }

      // Deduplicate
      for (let key in dependencies) {
        dependencies[key] = Array.from(new Set(dependencies[key]));
      }

      console.log("Done creating dependency tree");
      console.log(dependencies);

      let code = dedent`\n
        var __modules__ = {};
        function define(names, module) {
          for (var i = 0; i < names.length; i++) {
            __modules__[names[i]] = {value: null, init: module};
          }
        }
        function require(name) {
          if (!__modules__[name]) {
            throw new Error("module " + name + " could not be imported");
          }
          else if (!__modules__[name].value) {
            __modules__[name].value = __modules__[name].init();
          }
          return __modules__[name].value;
        }
      `

      for (let key in dependencies) {
        let moduleCode = await retrieveFileByPath(key);
        let moduleNames = dependencies[key].map(name =>`"${name}"`).join(', ')
        code += dedent`\n
          define([${moduleNames}], function() {
            var exports = {};
            var module = {exports: exports};
          ` + moduleCode + dedent`\n
            return module.exports;
          });
        `;
      }

      for (let key in staticDependencies) {
        let fileType = staticDependencies[key].type;
        let fileData = await retrieveFileByPath(key, binaryFileTypes.includes(fileType));
        let body = "return null;";
        if (fileType in staticFileTypes) {
          body = staticFileTypes[fileType](fileData);
        }
        code += dedent`\n
          define(["${key}"], function() {
            ${body}
          });
        `;
      }

      let simpleImportRegex = /import\s+['"](.*?)['"];/g;
      let defaultImportRegex = /import\s+([A-Za-z0-9$_]+?)\s+from\s+['"](.*?)['"];/g;
      let destructuringImportRegex = /import\s+\{\s*([A-Za-z0-9$_, ]+?)\s*\}\s+from\s+['"](.*?)['"];/g;
      let combinedImportRegex = /import\s+([A-Za-z0-9$_]+?)\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\}\s+from\s+['"](.*?)['"];/g;

      let importCode = ''
      for (let result of bundleCode.matchAll(simpleImportRegex)) {
        importCode += `\nrequire("${result[1]}");\n`;
      }
      for (let result of bundleCode.matchAll(defaultImportRegex)) {
        importCode += `\nvar ${result[1]} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(destructuringImportRegex)) {
        importCode += `\nvar {${result[1]}} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(combinedImportRegex)) {
        importCode += dedent`\n
          var ${result[1]} = require("${result[3]}");
          var {${result[2]}} = require("${result[3]}");
        `;
      }

      bundleCode = bundleCode.replaceAll(simpleImportRegex, '');
      bundleCode = bundleCode.replaceAll(defaultImportRegex, '');
      bundleCode = bundleCode.replaceAll(destructuringImportRegex, '');
      bundleCode = bundleCode.replaceAll(combinedImportRegex, '');
      bundleCode = bundleCode.trim();
      bundleCode = importCode + bundleCode;

      code += bundleCode;
      const indexHTML = getIndexHTML(code);
      if (code.length > 0) {
        setWarning(false)
      }

      const iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0'); // Change from '100%' to '0' for frameborder
      frameRef.current.innerHTML = '';
      frameRef.current.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(indexHTML);
      iframe.contentWindow.document.close();

      // Access the iframe content and attach click event listener
      // const iframeContent = iframe.contentWindow.document
      // iframeContent.body.addEventListener('click', (event) => {
      //   console.log("clicked screen")
      //   console.log(event.screenY)
      //   const componentName = event.target.getAttribute('data-component-name');
      //   if (componentName) {
      //     console.log(event)
      //   }
      // }, true);

      clearUserPrompt();
      setPrompt("")
      setLineEditOperation({})
      setIsSubmitting(false)
      setCanCloseWarning(true)
      setDisplayWarningProgress(false)
      setFirstBuild(false);

      setStoringProgress(0)
      setProgress(0)

      // New App? -> Build Mode 
      if (clickedNewApp) {
        setBuildMode(true);     
        setBuildingStack(true)
      }
      setClickedNewApp(false)
      let extension = pageNames[currentPage].toLowerCase()
      if (pageNames[currentPage] === "Home") {extension = ""}
      changePage(extension)

      return projectName
    } catch (error) {
      if (firstBuild || blankSlate) {
        handleRebuild()
      } else {
      console.log(error)
      giveWarning("Error", "View console for error message from your code: Right Click > Inspect > Console", "User Close")
      // let location = await askGPT("Here's an error from my React app. Return back to me one of two things. Return 'App.js' if you're unsure what file is causing the error. If you think you know the name of the file causing the error, then return the name of that file back to me, and NOTHING else. Here is the error message: " + error)
      // setWarningText3("AI suggests: " + location)
      setIsSubmitting(false)
      setCanCloseWarning(true)
      setDisplayWarningProgress(false)
      setFirstBuild(false);
      }
    }
  }

  const handleRebuild = async () => {
    try {
      console.log("getting file paths")
      let filePaths = await retrieveFilePaths()
      if (firstBuild) {
        setWarning(true)
        filePaths = await retrieveFilePaths2()
      } else {filePaths = await retrieveFilePaths();}
      console.log("got file paths")
      console.log(filePaths)
      let fileTree = await retrieveFileTree();
      console.log("got file tree")
      console.log(fileTree)
      let projectName = filePaths[0].split("/")[0];
      let reactRegex = /import\s+React(?:\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\})?\s+from\s+['"]react['"]/;

      let srcFiles = filePaths.filter(x => x.startsWith(`${projectName}/src/`) && (x.endsWith('.js') || x.endsWith('.jsx')));
      let modules = [];
      for (let filePath of srcFiles) {
        let fileData = await retrieveFileByPath(filePath)
        let moduleCode =  Babel.transform(fileData, { presets: [["env", {"modules": false}], "react"] }).code;
        if (!reactRegex.test(moduleCode)) {
          moduleCode = 'import React from "react";\n' + moduleCode;
        }
        modules.push({
          name: filePath,
          code: moduleCode,
          isEntry: filePath === `${projectName}/src/index.js`
        });
      }

      let moduleById = {};
      modules.forEach(module => {
        moduleById[module.name] = module;
      });

      let inputOptions = {
        input: [`${projectName}/src/index.js`],
        plugins: [{
          resolveId (importee, importer) {
            let fileType = importee.split('.').slice(-1)[0];
            if (!importer) return importee;
            if (importee in moduleById) return importee;
            if (importee[0] !== '.') return false;
            if (fileType in staticFileTypes) return false;

            let filePath = path.join(path.dirname(importer), importee);
            let resolved = resolvePath(fileTree, filePath);
            if (!(resolved in moduleById)) {
              throw new Error(`Could not resolve '${importee}' from '${importer}'`);
            }
            return resolved;
          },
          load: function (id) {
            return moduleById[id].code;
          }
        }],
      }

      let rolledUp = await rollup.rollup(inputOptions);
      let bundle = await rolledUp.generate({});
      let bundleCode = bundle.output[0].code;

      let staticDependencies = {}
      let bundleDependencies = {}
      for (let name of bundle.output[0].imports) {
        let fileType = name.split('.').slice(-1)[0]
        if (fileType in staticFileTypes) {
          staticDependencies[name] = { type: fileType };
        }
        else {
          let modulePath = await resolvePackage(fileTree, path.join(projectName, 'node_modules', name));
          bundleDependencies[modulePath] = [name];
        }
      };
  
      let dependencies = {};
      for (let key in bundleDependencies) {
        dependencies[key] = [...bundleDependencies[key]];
      }
      let dependencyQueue = Object.keys(dependencies);
      while (dependencyQueue.length) {
        let fileName = dependencyQueue.shift();
        let contents = await retrieveFileByPath(fileName);
        let regexp = /require\(['"](.+?)['"]\)/g
        let results = contents.matchAll(regexp);
        for (let result of results) {
          let requirePath;
          try {
            // Check if the dependency is a node submodule (local node_modules)
            requirePath = path.join(path.dirname(fileName), result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          } catch {
            // Fall back to the top-level node_modules
            requirePath = path.join(projectName, 'node_modules', result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          }
          if (!(requirePath in dependencies)) {
            dependencyQueue.push(requirePath);
            dependencies[requirePath] = [];
          }
          dependencies[requirePath].push(result[1]);
        }
      }

      // Deduplicate
      for (let key in dependencies) {
        dependencies[key] = Array.from(new Set(dependencies[key]));
      }

      console.log("Done creating dependency tree");
      console.log(dependencies);

      let code = dedent`\n
        var __modules__ = {};
        function define(names, module) {
          for (var i = 0; i < names.length; i++) {
            __modules__[names[i]] = {value: null, init: module};
          }
        }
        function require(name) {
          if (!__modules__[name]) {
            throw new Error("module " + name + " could not be imported");
          }
          else if (!__modules__[name].value) {
            __modules__[name].value = __modules__[name].init();
          }
          return __modules__[name].value;
        }
      `

      for (let key in dependencies) {
        let moduleCode = await retrieveFileByPath(key);
        let moduleNames = dependencies[key].map(name =>`"${name}"`).join(', ')
        code += dedent`\n
          define([${moduleNames}], function() {
            var exports = {};
            var module = {exports: exports};
          ` + moduleCode + dedent`\n
            return module.exports;
          });
        `;
      }

      for (let key in staticDependencies) {
        let fileType = staticDependencies[key].type;
        let fileData = await retrieveFileByPath(key, binaryFileTypes.includes(fileType));
        let body = "return null;";
        if (fileType in staticFileTypes) {
          body = staticFileTypes[fileType](fileData);
        }
        code += dedent`\n
          define(["${key}"], function() {
            ${body}
          });
        `;
      }

      let simpleImportRegex = /import\s+['"](.*?)['"];/g;
      let defaultImportRegex = /import\s+([A-Za-z0-9$_]+?)\s+from\s+['"](.*?)['"];/g;
      let destructuringImportRegex = /import\s+\{\s*([A-Za-z0-9$_, ]+?)\s*\}\s+from\s+['"](.*?)['"];/g;
      let combinedImportRegex = /import\s+([A-Za-z0-9$_]+?)\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\}\s+from\s+['"](.*?)['"];/g;

      let importCode = ''
      for (let result of bundleCode.matchAll(simpleImportRegex)) {
        importCode += `\nrequire("${result[1]}");\n`;
      }
      for (let result of bundleCode.matchAll(defaultImportRegex)) {
        importCode += `\nvar ${result[1]} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(destructuringImportRegex)) {
        importCode += `\nvar {${result[1]}} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(combinedImportRegex)) {
        importCode += dedent`\n
          var ${result[1]} = require("${result[3]}");
          var {${result[2]}} = require("${result[3]}");
        `;
      }

      bundleCode = bundleCode.replaceAll(simpleImportRegex, '');
      bundleCode = bundleCode.replaceAll(defaultImportRegex, '');
      bundleCode = bundleCode.replaceAll(destructuringImportRegex, '');
      bundleCode = bundleCode.replaceAll(combinedImportRegex, '');
      bundleCode = bundleCode.trim();
      bundleCode = importCode + bundleCode;

      code += bundleCode;
      const indexHTML = getIndexHTML(code);
      if (code.length > 0) {
        setWarning(false)
      }

      // const iframe = document.createElement('iframe');
      // iframe.setAttribute('width', '100%');
      // iframe.setAttribute('height', '100%');
      // iframe.setAttribute('frameborder', '0');
      // frameRef.current.innerHTML = '';
      // frameRef.current.appendChild(iframe);
      // iframe.contentWindow.document.open();
      // iframe.contentWindow.document.write(indexHTML);
      // iframe.contentWindow.document.close();

      const iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0'); // Change from '100%' to '0' for frameborder
      frameRef.current.innerHTML = '';
      frameRef.current.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(indexHTML);
      iframe.contentWindow.document.close();

      // Access the iframe content and attach click event listener
      // const iframeContent = iframe.contentWindow.document
      // iframeContent.body.addEventListener('click', (event) => {
      //   console.log("clicked screen")
      //   const componentName = event.target.getAttribute('data-component-name');
      //   if (componentName) {console.log(componentName)}
      // }, true);

      clearUserPrompt();
      setPrompt("")
      setLineEditOperation({})
      setIsSubmitting(false)
      setCanCloseWarning(true)
      setDisplayWarningProgress(false)
      setFirstBuild(false);

      let found = false
      for (let i=0;i<openFiles.length;i++) {
        if (openFiles[i].path === path) {
          // File is already open
          found = true
          setOpenFileNum(i)
          setFile( openFiles[i] )
        }
      }
      if (!found) {
        // Open up App.js if it exists
        let appjs = null;
        try {appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
        } catch {appjs = null}
        if (appjs !== null) {
          await handleFileOpen(`${projectTitle}/src/App.js`)
        }
      }

      // New App? -> Build Mode 
      if (clickedNewApp) {
        setBuildMode(true)
        setBuildingStack(true)
      }
      setClickedNewApp(false)

    } catch (error) {
      console.log(error)
      giveWarning("Error", "View console for error message from your code: Right Click > Inspect > Console", "User Close")
      let location = await askGPT("Here's an error from my React app. Return back to me one of two things. Return 'App.js' if you're unsure what file is causing the error. If you think you know the name of the file causing the error, then return the name of that file back to me, and NOTHING else. Here is the error message: " + error)
      setWarningText3("AI suggests: " + location)
      setIsSubmitting(false)
      setCanCloseWarning(true)
      setDisplayWarningProgress(false)
      setFirstBuild(false);
      
    }
  }

  // MONACO EDITOR FUNCTIONS
  const [openFiles, setOpenFiles] = useState([])

  function handleEditorChange(index) {
    if (openFiles.length > 0) {
      let openFilesCopy = openFiles
      openFilesCopy[index].value = editorRef.current.getValue()
      setOpenFiles(openFilesCopy)
      storeFile(openFilesCopy[index].path, openFilesCopy[index].value)
    }
  };

  const [sidebar, setSidebar] = useState(false);
  const [openFileNum, setOpenFileNum] = useState(null);

  function handleSidebar() {
    setSidebar(prevSidebar => !prevSidebar);
  }

  let currentFile = null;
  function closeFile(fileNum) {
    const isCurrentlyOpenFile = fileNum === openFileNum;
    
    setOpenFiles(prevOpenFiles => {
      const newArray = prevOpenFiles.filter((_, index) => index !== fileNum);
      if (isCurrentlyOpenFile) {
        setOpenFileNum(null); 
        currentFile = null
        setFile(null)
        // if (editorRef.current) {
        //   editorRef.current.setValue("");
        // }
      }
      return newArray;
    });
  }

  currentFile = openFiles[openFileNum];
  const [file, setFile] = useState(currentFile)

  async function handleSidebar() {
    let sideOpen = sidebar;
    setSidebar(!sideOpen)
    if (!sideOpen) {
      let fileTree = await retrieveFileTree()
      setTree(fileTree)
    }
  }

  async function handleFileOpen(path) {
    let openFilesCopy = openFiles
    let fileData = await retrieveFileByPath(path)
    let found = false
    for (let i=0;i<openFilesCopy.length;i++) {
      if (openFilesCopy[i].path === path) {
        // File is already open
        found = true
        setOpenFiles(openFilesCopy)
        setOpenFileNum(i)
        setFile( openFiles[i] )
        
      }
    }

    if (!found) {
      // Open file
      let fileNames = path.split("/")
      let fileName = fileNames[fileNames.length - 1]
      let fileType = fileName.split(".")
      let type = "javascript";
      if (fileType[1] === "html") {type="html"}
      if (fileType[1] === "js") {type="javascript"}
      if (fileType[1] === "jsx") {type="javascript"}
      if (fileType[1] === "ts") {type="typescript"}
      if (fileType[1] === "css") {type="css"}
      if (fileType[1] === "json") {type="json"}

      // setOpenFiles( prev => [{
      //   name: fileName,
      //   language: type,
      //   value: fileData,
      //   path: path
      // }, ...prev])
      setOpenFiles( prev =>[{
        name: fileName,
        language: type,
        value: fileData,
        path: path }, ...prev])
      setRefreshCount(refreshCount + 1)
      setFile({
        name: fileName,
        language: type,
        value: fileData,
        path: path
      })
      setOpenFileNum(0)
    } 
    return fileData
  }

  function clearUserPrompt() {
    const inputElement = document.getElementById("userPrompt");
    if (inputElement) {
      inputElement.value = "";
    }
  }

  // DISPLAY
  async function handleFrameChange(frameNumber) {
    console.log(AIResults)
    console.log(lastEdited)
    if (lastEdited !== "") {
      try {
        if (frameNumber === 0) {
          await storeFile(lastEdited, editorCurrent)
        } 
        else {
          await storeFile(lastEdited, AIResults[frameNumber - 1])
        }
        let openFilesCopy = openFiles
        setOpenFiles([])
        setFile({})
        setOpenFileNum(null)
  
        let newOpenFiles = []
        async function openAfterSubmit(path) {
          let fileData = await retrieveFileByPath(path)
        
          // Open file
          let fileNames = path.split("/")
          let fileName = fileNames[fileNames.length - 1]
          let fileType = fileName.split(".")
          let type = "javascript";
          if (fileType[1] === "html") {type="html"}
          if (fileType[1] === "js") {type="javascript"}
          if (fileType[1] === "jsx") {type="javascript"}
          if (fileType[1] === "ts") {type="typescript"}
          if (fileType[1] === "css") {type="css"}
          if (fileType[1] === "json") {type="json"}

          newOpenFiles.push({
            name: fileName,
            language: type,
            value: fileData,
            path: path })
          setRefreshCount(refreshCount + 1)
          setFile({
            name: fileName,
            language: type,
            value: fileData,
            path: path
          })
          setOpenFileNum(0)
        } 

        for (let k=0;k<openFilesCopy.length;k++) {
          try {
            await openAfterSubmit(openFilesCopy[k].path)
          } catch(error) {console.log(error)}
        }
        setOpenFiles(newOpenFiles)
        
        setCurrentFrame(frameNumber)
        monacoAutoformat()
        const moneyyy = await handleBuild(); 
      } catch (error) {console.log(error)}
    }
  }

  function giveWarning(topText, bottomText, type) {
    setWarning(true);
    setWarningText1(topText);
    setWarningText2(bottomText);
  
    if (type === "Self Close") {
      setTimeout(function () {
        setWarning(false);
        setWarningText1("Storing Project Files...");
        setWarningText2("Please wait, this may take a few minutes");
        setWarningText3("")
      }, 3800);
    }
  }

  // CLOSE ALERTS 
  let outsideClicks = 0;
  function handleOutsideClick() {
    if (canCloseWarning) { 
      if (outsideClicks !== 0) {
        setWarningText3("")
        setWarning(false)
        setDotsOpen(false)
        outsideClicks = 0;
      } else {outsideClicks += 1}
    }
  };

  let outsideClicks2 = 0;
  function handleOutsideClick2() {
    if (outsideClicks2 !== 0) {
      setDotsOpen(false)
      outsideClicks2 = 0;
    } else {outsideClicks2 += 1}
  };

  let optionsOutsideClicks = 0;
  function handleOptionsOutsideClick() {
    if (optionsOutsideClicks !== 0) {
      console.log(1)
      setOptionsOpen(false)
      optionsOutsideClicks = 0;
    } else {optionsOutsideClicks += 1}
  };

  let cssOutsideClicks = 0;
  function handleCSSOutsideClick() {
    if (cssOutsideClicks !== 0) {
      resetCSSPopup()
      cssOutsideClicks = 0;
    } else {cssOutsideClicks += 1}
  };

  let linkOutsideClicks = 0;
  function handleLinkOutsideClick() {
    if (linkOutsideClicks !== 0) {
      setSelectingLink(false)
      setSelectingLinkStep1(false)
      setSelectingLinkStep2(false)
      linkOutsideClicks = 0;
    } else {linkOutsideClicks += 1}
  };

  // SETTINGS 
  function switchModel() {
    if (GPTModel === "4") {
      setGPTModel("3.5-turbo")
    } else {setGPTModel("4")}
  }

  async function handleExport() {
    setIsUploading(true)
    setExportText("Exporting Zip...");
    const db = await openDatabase();
    const zip = new JSZip();
  
    const countTransaction = db.transaction(["files"], "readonly");
    const countObjectStore = countTransaction.objectStore("files");
    const countRequest = countObjectStore.count();
  
    countRequest.onsuccess = async event => {
      const fileCount = event.target.result;
      let number = 0;
      let projectName = "";
  
      const transaction = db.transaction(["files"], "readonly");
      const objectStore = transaction.objectStore("files");
      const request = objectStore.openCursor();
  
      request.onsuccess = async event => {
        const cursor = event.target.result;
        if (cursor) {
          const fileData = cursor.value.content;
          const fileName = cursor.value.filepath;
  
          if (number === 0) {
            projectName = fileName.split("/")[0];
          }
          number += 1;
          if (number % 370 === 0) {
            setProgress((number / fileCount) * 100)
           }
  
          if (!fileName.startsWith(`${projectName}/node_modules`)) {
            if (fileData !== undefined) {
              zip.file(fileName, fileData);
            }
          }
  
          cursor.continue();
        } else {
          try {
            if (Object.keys(zip.files).length > 0) {
              const content = await zip.generateAsync({ type: "blob" });
              const zipFileName = `${projectName}.zip`;
  
              const downloadLink = document.createElement("a");
              downloadLink.href = URL.createObjectURL(content);
              downloadLink.download = zipFileName;
  
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
  
              console.log("Export successful!");
              setExportText("Export Zip");
              setIsUploading(false)
              setProgress(0)
            } else {
              console.log("No files to export.");
              setExportText("Export Zip");
              setIsUploading(false)
              setProgress(0)
            }
          } catch (error) {
            console.error("An error occurred while exporting the project.", error);
            setExportText("Export Zip");
            setIsUploading(false)
            setProgress(0)
          }
        }
      };
  
      request.onerror = event => {
        console.error("An error occurred while exporting the project.", event.target.error);
        setExportText("Export Zip");
      };
    };
  
    countRequest.onerror = event => {
      console.error("An error occurred while counting the files.", event.target.error);
      setExportText("Export Zip");
    };
  }
  

  // OPTIONS 
  const handleBlankSlate = async () => {
    setRefreshCount(1) 
    setHasRunOnce(false)
    setAIResults([])
    setCurrentFrame(0)
    setEditorCurrent("")
    setAIMode("ALTER")
    // setWarning(false)
    // setWarningText1("Building Project...")
    // setWarningText2("Please wait, this may take a moment")
    // setWarningText3("")
    setDotsOpen(false)
    setOptionsOpen(false)
    setSlate(0)
  
    // Editor States 
    setLinePosition({});
    setLineEditOperation({})
    // setEditorObject({})
    // setMonacoObject({})
    setEditorScrollbar("hidden")
    setFullScreen(false)
    setFullScreenText("Full Screen")
    // "visible"
    setError("")
    // setProgress(0);
    // setStoringProgress(0);
    // setIsUploading(false)
    setIsSubmitting(false)
    setCanCloseWarning(false)
    setRenderButtonWidths("25%")
    setCanShowWarning(true)
  
    // AI States
    setPrompt("");
    setMessages([]);
    setIsLoading(false);
    setLoading("");
    setGPTModel("3.5-turbo")
    setNumberOfRenders(4)
    setModelTemperature(0.8)
    
    // File Upload States
    setOriginalFile("");
    setExportText("Export Zip")
    // setDisplayWarningProgress(false)
  
    // Build Mode
    setBuildMode(false)
    setBuildAlert1Text("Your Project")
    setBuildButton1Text("Let's Get Started")
    setBuildModeStack(false)
    setBuildingStack(false)
    setUpdateStackNum(1)
    setSelectedBuildComponent("")
    setLastEdited("")

    setHasFiles(true)
    setShowEditor(true)
    setShowGPT(false)
    setFirstBuild(true)
    setClickedNewApp(true)
    setProjectTitle("react-app")
    setCurrentStack([[]])
  

    setTree({ "React Project": {}  })
    setExpandedNodes({});
    setOpenFiles([])
    setFile(null)
    setSidebar(false);
    setOpenFileNum(null);
    setDisplayColor("white")

    const git_user = "josephgoff-git";
    const git_repo = "ReactApp-Blank";
    const branch = "master";
    // const proxyUrl = 'http://localhost:3001/github-proxy';
    const proxyUrl = `${server}/github-proxy`;
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

      await handleGitUpload(filesArray);
      await handleBuild()

      // let appjs = null;
      // try {appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
      // } catch {appjs = null}
      // if (appjs !== null) {
      //   await handleFileOpen(`${projectTitle}/src/App.js`)
      // }

    } catch (error) {
      console.error('Error downloading or processing the zip file:', error);
    }
  };

  async function handleGitUpload(files) {
    indexedDB.deleteDatabase("ReactProjectsDatabase");
    console.log("Deleted database");

    const db = await openDatabase(); 
    console.log("Opened new database");
    const transaction = db.transaction('files', 'readwrite');
    console.log("Began transaction");
    const objectStore = transaction.objectStore('files');
    console.log("Initiated Object Store");
    // await objectStore.clear();
    console.log("Cleared database");

    if (!files.length) {
        alert('Please select a folder to upload.');
        return;
    }

    await storeGitFiles(files);
    setFirstBuild(true)
    setHasFiles(true)
    setShowEditor(true)
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

  // BUILD MODE
  let canSelect = true;
  const emptyAppJS = `import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
  import Home from './pages/Home/Home.js'

  function App() {
    return (
      <>
        <Router>
          <Routes >
            <Route path='/' element={<Home/>} />
          </Routes>
        </Router>
      </>
    );
  }
  
  export default App;
  `
  
  // Rearrangable Components
  const [canDrag, setCanDrag] = useState(true)
  
  function DraggableList() {
    
    const initialPositions = []
    if (currentStack[currentPage]) {
      for (let i=0;i<currentStack[currentPage].length;i++) {
        initialPositions.push({ x: 0, y: 0 })
      }
    }
    
   let positions = initialPositions
    const [currentItem, setCurrentItem] = useState(null)


    function reorganizeArray(arr, currentIndex, value) {
      const newArr = [...arr];
    
      // Calculate the new index after moving by the specified value
      const newIndex = currentIndex + value;
    
      // Ensure the newIndex is within the bounds of the array
      const adjustedIndex = Math.max(0, Math.min(newIndex, arr.length - 1));
    
      // Remove the element at the current index and insert it at the adjusted index
      const removedElement = newArr.splice(currentIndex, 1)[0];
      newArr.splice(adjustedIndex, 0, removedElement);
      return newArr;
    }

    const handleDrag = (e, ui, index) => {
      // Update the positions array with the new position of the dragged item
      const newPositions = [...positions];
      newPositions[index] = { x: ui.x, y: ui.y };
      positions = newPositions  
      setCurrentItem(index)
    };

    return (
      <>
        {positions.map((position, index) => (
        
        <Draggable
            key={index}
            bounds="parent"
            className="select-none" 
            onDrag={(e, ui) => {
              if (canDrag) {
                handleDrag(e, ui, index)
              }
            }}
            defaultPosition={initialPositions[index]}
            onStop={
              async (e)=>{
                setCanDrag(false)
                let originalStack = currentStack
                let rearrangement = originalStack
                let rearrange = false
                async function stopDrag() {
                  let indicator = positions[index].y / 40
                  let numberToJump = 0;

                  if (indicator > 0.5 || indicator < -0.5) {
                    if (indicator > 0.5) {
                      numberToJump = Math.floor(indicator + 0.5)
                      rearrange = true
                    } 
                    else if (indicator < 0.5) {
                      numberToJump = Math.ceil(indicator - 0.5)
                      rearrange = true
                    }

                    rearrangement = reorganizeArray(originalStack[currentPage], index, numberToJump);
                  }

                  if (rearrange) {

                    let appjs = null;
                    try {
                      appjs = await retrieveFileByPath(`${projectTitle}/src/pages/${pageNames[currentPage]}/${pageNames[currentPage]}.js`)
                    } catch {appjs = null}
                    try {
                      if (appjs !== null) {
                        let currentCode = appjs
                        let pieces = rearrangeComponents(currentCode, rearrangement, originalStack[currentPage])
                        console.log(pieces)
                        
                        let originalStack2 = currentStack
                        originalStack2[currentPage] = rearrangement
                        setCurrentStack(originalStack2)

                        if (pieces && pieces.length >= 3) {
                          let componentPieces = reorganizeArray(pieces[1], index, numberToJump)
                          for (let k=0;k<componentPieces.length;k++) {
                            componentPieces[k] = componentPieces[k].trim()
                          }
                          currentCode = [pieces[0], componentPieces.join("\n"), pieces[2]].join("")
                          console.log(currentCode)
                          if (editorRef.current && appjs !== null) {
                            try {
                              await storeFile(`${projectTitle}/src/pages/${pageNames[currentPage]}/${pageNames[currentPage]}.js`, currentCode)
                              // Refresh files by closing all 
                              setOpenFiles([])
                              setFile({})
                              setOpenFileNum(null)
                              
                            } catch (error) {console.log(error)}
                            await handleBuild()
                            monacoAutoformat()
                          }
                        }
                    
                        // This will refresh the stack state
                        if (selectedBuildComponent !== currentStack[currentPage][index]) {
                          setSelectedBuildComponent(currentStack[currentPage][index])
                          // setBuildingStack(false)
                        } else {
                          setSelectedBuildComponent("")
                          // setBuildingStack(true)
                        }
                      }
                    } catch (error) {
                      console.log(error)
                    }

                  } else {
                    // Not a rearrange 
                    const target = e.target;
                    if (
                      target.classList.contains("component-item-close") ||
                      target.closest(".component-item-close")
                    ) {
                      // Deletion
                      await deleteComponent(index)
                    } else {
                      // Clicked on component
                      // Grab the current css file 
                      let cssFile = ""
                      let cssObject = {}
                      try {
                        cssFile = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.css`)
                      } catch(error) {console.log(error)}
                      if (cssFile !== "") {
                        setCurrentCSSFile(cssFile)
                        cssObject = createCSSObject(cssFile)
                      }

                      setCurrentComponentIndex(index)
                      let createdTree = await handleCreateElementTree(index, true, cssObject)
                      setBuildModeStackRoute("Component")


                      // Set element tree to full open
                      function getAllPaths(obj, currentPath = '') {
                        let paths = [];
                      
                        for (let key in obj) {
                          let newPath = currentPath ? `${currentPath}/${key}` : key;
                      
                          if (typeof obj[key] === 'object' && obj[key] !== null) {
                            // If the current value is an object, recursively call the function
                            paths.push(newPath);
                            paths = paths.concat(getAllPaths(obj[key], newPath));
                          } else {
                            // If it's a leaf node (non-object), add the path to the array
                            paths.push(newPath);
                          }
                        }
                      
                        return paths;
                      }
                      let pushObject = {}
                      let paths = getAllPaths(createdTree)
                      for (let j=0;j<paths.length;j++) {
                        pushObject[paths[j]] = true
                      }
                      setExpandedElementNodes(pushObject)
                      setShowAddTextInput(false)

                      if (selectedBuildComponent === currentStack[currentPage][index]) {
                        setSelectedBuildComponent("")
                      } else {
                        setSelectedBuildComponent(currentStack[currentPage][index])
                        setBuildingStack(true)
                      }
                    }
                  }

                }
                await stopDrag()

                console.log("opening component")
                // Open up component file again if it exists
                try {
                  let componentFile = null;
                  try {componentFile = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.js`)
                  } catch {componentFile = null}
                  if (componentFile !== null) {
                    await handleFileOpen(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.js`)
                  }
                } catch (error) {
                  console.log(error)
                }
                setCanDrag(true)
              }
            }>
            <div className="component-item select-none" style={{userSelect: "none"}}>
              <div 
                className="hover-dim2 select-none" 
                style={{userSelect: "none", zIndex: 998,marginTop: "5px", cursor: "pointer", width: "110px", marginLeft: "10px", height: "33px", backgroundColor: selectedBuildComponent === currentStack[currentPage][index] ? "#999" :  "white", border:"1px solid black", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <p className="select-none" style={{userSelect: "none", color: "black", fontWeight: "bold", fontFamily: "unset"}}>
                  {currentStack[currentPage][index]}
                </p>
              </div>

            <div 
              className="component-item-close"
              data-index={index}
              id="deleteComponent" 
              style={{marginRight: "-6px", marginTop: "-5px", zIndex: 999, opacity: 0, filter: "brightness(90%)", cursor: "pointer", backgroundColor: "white", borderRadius: "50%", position: "absolute", top: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center"}}>
              
                <AiFillCloseCircle 
                  className="component-item-close"
                  data-index={index}
                  color="black" 
                  fontSize={20} 
                />
              </div>
        
            </div>
          </Draggable> 
        ))}
      </>
    );
  }

  function PagesDraggableList() {
    
    const initialPositions = []
    for (let i=0;i<pageNames.length;i++) {
      initialPositions.push({ x: 0, y: 0 })
    }
    
    let positions = initialPositions
    const [currentItem, setCurrentItem] = useState(null)

    function reorganizeArray(arr, currentIndex, value) {
      const newArr = [...arr];
    
      // Calculate the new index after moving by the specified value
      const newIndex = currentIndex + value;
    
      // Ensure the newIndex is within the bounds of the array
      const adjustedIndex = Math.max(0, Math.min(newIndex, arr.length - 1));
    
      // Remove the element at the current index and insert it at the adjusted index
      const removedElement = newArr.splice(currentIndex, 1)[0];
      newArr.splice(adjustedIndex, 0, removedElement);
    
      return newArr;
    }

    const handleDrag = (e, ui, index) => {
      // Update the positions array with the new position of the dragged item
      const newPositions = [...positions];
      newPositions[index] = { x: ui.x, y: ui.y };
      positions = newPositions  
      setCurrentItem(index)
    };

    return (
      <>
        {positions.map((position, index) => (
        
        <Draggable
            key={index}
            bounds="parent"
            className="select-none" 
            onDrag={(e, ui) => {
              if (canDrag) {
                handleDrag(e, ui, index)
              }
            }}
            defaultPosition={initialPositions[index]}
        
            onStop={
              async (e)=>{
                setCanDrag(false)
                let currentStackCopy = pageNames
                let rearrange = false
                let numberToJump = 0;
                async function stopDrag() {
                  let indicator = positions[index].y / 40
                  if (indicator > 0.5 || indicator < -0.5) {
                    if (indicator > 0.5) {
                      numberToJump = Math.floor(indicator + 0.5)
                      rearrange = true
                    } 
                    else if (indicator < 0.5) {
                      numberToJump = Math.ceil(indicator - 0.5)
                      rearrange = true
                    }
                  }
                }
                await stopDrag()

                if (rearrange) {
                  currentStackCopy = reorganizeArray(currentStackCopy, index, numberToJump);
                  setPageNames(currentStackCopy)
                  let currentStackReorder = reorganizeArray(currentStack, index, numberToJump);
                  setCurrentStack(currentStackReorder)
                } else {
                  // Not a rearrange 
                  const target = e.target;
                  if (
                    target.classList.contains("component-item-close") ||
                    target.closest(".component-item-close")
                  ) {
                    // Deletion
                    await deletePage(index)
                  } else {
                    // Clicked on page
                    try {
                      let componentFile = null;
                      try {componentFile = await retrieveFileByPath(`${projectTitle}/src/pages/${pageNames[index]}/${pageNames[index]}.js`)
                      } catch {componentFile = null}
                      if (componentFile !== null) {
                        await handleFileOpen(`${projectTitle}/src/pages/${pageNames[index]}/${pageNames[index]}.js`)
                        if (!rearrange) {
                          setBuildModeStackRoute("Page")
                          setCurrentPage(index)
                        }
                      }
                    } catch (error) {console.log(error)}
                    
                    let extension = pageNames[index].toLowerCase()
                    console.log(extension)
                    if (pageNames[index] === "Home") {extension = ""}
                    redirect(extension)
                  }
                }
                setCanDrag(true)
              }
            }>
            <div className="component-item select-none" style={{userSelect: "none"}}>
              <div 
                className="hover-dim2 select-none" 
                style={{userSelect: "none", zIndex: 998,marginTop: "5px", cursor: "pointer", width: "110px", marginLeft: "10px", height: "33px", backgroundColor: "white", border:"1px solid black", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <p className="select-none" style={{userSelect: "none", color: "black", fontWeight: "bold", fontFamily: "unset"}}>
                  {pageNames[index]}
                </p>
              </div>

            <div 
              className="component-item-close"
              data-index={index}
              id="deleteComponent" 
              style={{marginRight: "-6px", marginTop: "-5px", zIndex: 999, opacity: 0, filter: "brightness(90%)", cursor: "pointer", backgroundColor: "white", borderRadius: "50%", position: "absolute", top: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center"}}>
                {pageNames[index] !== "Home" && 
                <AiFillCloseCircle 
                  className="component-item-close"
                  data-index={index}
                  color="black" 
                  fontSize={20} 
                />}
              </div>

            </div>
          </Draggable> 
        ))}
      </>
    );
  }

  
  // Components
  function insertComponent(sourceCode, componentName) {

    const regex = /<\s*\/\s*(\w*)\s*>/g;
    let codeToParse = sourceCode;
    let lastClosingTag;
    let done = false;

    while (!done) {
      const match = regex.exec(codeToParse);

      if (match) {
        // Update the last closing tag
        lastClosingTag = match[0];
      } else {
        // No more closing tags found, exit the loop
        done = true;
      }
    }

    let returnCode = sourceCode;
    if (lastClosingTag) {
      // Split the codeToParse just before the last closing tag
      const splitIndex = codeToParse.lastIndexOf(lastClosingTag);
      const firstPart = codeToParse.slice(0, splitIndex);
      const secondPart = codeToParse.slice(splitIndex);

      // Now you have two parts: firstPart and secondPart
      console.log("First part:", firstPart);
      console.log("Second part:", secondPart);

      returnCode = firstPart + `<${componentName}/>\n` + secondPart
    } else {
      console.log("No closing tags found in the code.");
    }

    return returnCode
  }

  async function addComponent(component) {
    // Check if component is already in the stack and rename if needed
    let allComponents = []
    for (let i=0;i<currentStack.length;i++) {
      for (let j=0;j<currentStack[i].length;j++) {
        allComponents.push(currentStack[i][j])
      }
    }

    // Rename component to add
    let componentName = component
    let originalComponentName = component
    let newComponentName = component
    if (allComponents.includes(componentName)) {
      let i = 2
      let done = false
      let newName = componentName
      while (!done) {
        newName = componentName + "_" + i
        if (allComponents.includes(newName)) {i += 1} 
        else {done = true}
      }
      componentName = newName
      newComponentName = newName
    }

    // Retrieve component code from github 
    const git_user = "josephgoff-git";
    const git_repo = "components";
    const branch = "master";
    // const proxyUrl = 'http://localhost:3001/github-proxy';
    // const proxyUrl = 'https://reactaiserver.azurewebsites.net/github-proxy';
    const proxyUrl = `${server}/github-proxy`;
    
    const githubApiUrl = `https://api.github.com/repos/${git_user}/${git_repo}/zipball/${branch}`;
  
    try {
      const response = await axios.get(`${proxyUrl}?url=${encodeURIComponent(githubApiUrl)}`, {
        responseType: 'arraybuffer',
      });
  
      const zipData = new Uint8Array(response.data);
      const jszip = new JSZip();
      const unzippedFiles = await jszip.loadAsync(zipData);
     
      let process = 0;
      const filesArray = [];
      for (const [relativePath, file] of Object.entries(unzippedFiles.files)) {
        // If file is actually a file
        if (file.dir || file._data.uncompressedSize === 0) {
            continue;
        // And if file is not from node modules
        } else if (file.name.includes("/node_modules/")) {
            continue

        } else if (!file.name.includes(`/${originalComponentName}/`)) {

          continue
        } else {
            let blob = await file.async('blob');
            const fileName = file.name.replace(/^[^/]+\//, 'react-app/');
            const fileType = blob.type;
            const fileName1 = fileName.split('/').pop();

            let parts = fileName.split('/');
            parts[1] = "src/components";
            parts[2] = componentName
            parts[3] = componentName + "." + parts[3].split(".")[1]
            let newFileName = parts.join('/');

            const fileObject = {
                blob,
                name: fileName1,
                type: fileType,
                webkitRelativePath: newFileName,
            };
            filesArray.push(fileObject);
        }
        process += 1;
      }

      await handleComponentUpload(filesArray);

      let found = false
      for (let i=0;i<openFiles.length;i++) {
        if (openFiles[i].path === path) {
          // File is already open
          found = true
          setOpenFileNum(i)
          setFile( openFiles[i] )
        }
      }
      let appjs = null;
      if (!found) {
        // Open up file if it exists
        try {appjs = await retrieveFileByPath(`${projectTitle}/src/pages/${pageNames[currentPage]}/${pageNames[currentPage]}.js`)
        } catch {appjs = null}
        if (appjs !== null) {
          await handleFileOpen(`${projectTitle}/src/pages/${pageNames[currentPage]}/${pageNames[currentPage]}.js`)
        }
      }

      let currentCode = appjs

      let importedValues = []
      let imports = currentCode.split("import ")
      if (imports.length > 0) {
        for (let j=0;j<imports.length;j++) {
          let constituents = imports[j].split(" ")
          if (constituents.length > 0) {
            importedValues.push(constituents[0])
          }
        }
      }

      let newValue = currentCode
      
      // If component is not already imported 
      if (!importedValues.includes(componentName)) {
        newValue = `import ${componentName} from '../../components/${componentName}/${componentName}.js'` + "\n" + currentCode
      }
      
      // Add the tag to App.js
      newValue = insertComponent(newValue, componentName)
      try {
        await storeFile(`${projectTitle}/src/pages/${pageNames[currentPage]}/${pageNames[currentPage]}.js`, newValue)
        setFile(null)
        setOpenFileNum(null)
        setOpenFiles([])

        console.log(newValue)
        let componentCode = null
        try {componentCode = await retrieveFileByPath(`${projectTitle}/src/components/${componentName}/${componentName}.js`)
        } catch {componentCode = null}
        
        if (componentCode) {
          let regex = new RegExp(originalComponentName, 'g');
          componentCode = componentCode.replace(regex, componentName);  

          console.log(componentCode)

          try {
            storeFile(`${projectTitle}/src/components/${componentName}/${componentName}.js`, componentCode)
            setFile(null)
            setOpenFileNum(null)
            setOpenFiles([])
          } catch (error){console.log(error)}
          await handleBuild(newValue)
        }
      
      } catch (error){console.log(error)}
      monacoAutoformat()

      // Update the stack
      let currentStackCopy = currentStack
      currentStackCopy[currentPage].push(newComponentName)
      setCurrentStack(currentStackCopy)
      
      // Rebuild
      // await handleBuild()

    } catch (error) {
      console.error('Error downloading or processing the zip file:', error);
    }
  };

  async function handleComponentUpload(files) {
    const db = await openDatabase(); 
    console.log("Opened new database");
    const transaction = db.transaction('files', 'readwrite');
    console.log("Began transaction");
    const objectStore = transaction.objectStore('files');
    console.log("Initiated Object Store");

    if (!files.length) {
        alert('Please select a folder to upload.');
        return;
    }

    await storeGitFiles(files);
    setFirstBuild(true)
    setHasFiles(true)
    setShowEditor(true)
};

  function rearrangeComponents(sourceCode, currentStackCopy, originalStack) {
    // Check old code to see if it is different from stack
    let results = parseChildren(sourceCode)
    let children = []
    for (let i=0;i<results.length;i++) {
      children.push(results[i].name)
    }
  
    let newTree = []
    if (children.length > 0) {
      for (let i=0;i<children.length;i++) {
        function checkCase(character) {
          if (character === character.toUpperCase()) {
            return 1
          } else if (character === character.toLowerCase()) {
            return 2
          } else {
            return 3
          }
        }
        if (checkCase(children[i][0]) === 1) {
          newTree.push(children[i])
        }
      }
    }

    console.log(newTree)
    console.log(currentStackCopy)

    // loop through code component tree to see if indexes match with stack
    let matches = true;
    if (newTree.length !== currentStackCopy.length) {matches = false} 
    let highestVal = newTree.length
    if (currentStackCopy.length < newTree.length) {highestVal = currentStackCopy.length}
    else {
      for (let i=0;i<highestVal;i++) {
        if (newTree[i] !== currentStackCopy[i]) {
          matches = false
        }
      }
    }

    if (!matches) {
      console.log("matching...")
      let remainder = sourceCode
      console.log(sourceCode)
      let pieces = []
      let firstPiece = ""
      let tracker = 0
      for (let j=0;j<originalStack.length;j++) {
        tracker = j
        let regex = new RegExp(`<\\s*${originalStack[j]}(\\s+|\\/)`);
        let match = regex.exec(remainder).index
        if (j===0) {
          firstPiece = remainder.substring(0, match);
          remainder = remainder.substring(match);
          console.log(remainder)
        }
        else {
          let match = regex.exec(remainder).index
          pieces.push(remainder.substring(0, match).trim())
          remainder = remainder.substring(match);
        } 
      }

      // Last component
      let lastPiece = ""
      let regex = new RegExp(`<\\s*\\/>`);
      let match = regex.exec(remainder).index

      pieces.push(remainder.substring(0, match).trim())
      lastPiece = "\n" + remainder.substring(match);

      console.log(firstPiece)
      console.log(pieces)
      console.log(lastPiece)


      // Return Code Pieces
      return [firstPiece, pieces, lastPiece]
      
    }
  }

  async function deleteComponent(index) {
    const isConfirmed = window.confirm(`Delete component ${currentStack[currentPage][index]}?`);
    if (isConfirmed) {
      // Step 1: Remove from Page file
      await removeComponentFromPage(pageNames[currentPage], currentStack[currentPage][index])
            
      // Step 2: Delete File
      await deleteFile(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.js`)
      await deleteFile(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.css`)
      
      // Step 3: Update Stack
      stackComponentDeletion(index)
      // keep track of the component files!! don't forget
      
      await handleBuild("");
    }
  }

  function stackComponentDeletion(dataIndex) {
    let copy = []
    for (let i=0;i<currentStack[currentPage].length;i++) {
      let dataIndexVal = dataIndex * 1
      if (i !== dataIndexVal) {
        copy.push(currentStack[currentPage][i])
      }
    }
    let currentStackCopy = currentStack
    currentStackCopy[currentPage] = copy
    setCurrentStack(currentStackCopy)
  }

  async function removeComponentFromPage(pageName, componentName) {
    // Alter page to remove import 
    let appjs = null;
    try {
      appjs = await retrieveFileByPath(`${projectTitle}/src/pages/${pageName}/${pageName}.js`)
    } catch {appjs = null}

    if (appjs !== null) {
      let currentCode = appjs
      console.log(currentCode)
      
      function removeImport(inputString) {
        const lines = inputString.split('\n');
        const modifiedLines = lines.filter(line => !line.trim().startsWith(`import ${componentName} `));
        const modifiedString = modifiedLines.join('\n');
        return modifiedString;
      }

      let newValue = removeImport(currentCode)

      // Remove the route
      function removeTag(inputString) {
        const pattern = new RegExp(`<\\s*${componentName}\\s*\\/\\s*>`, 'g');
        return inputString.replace(pattern, '');
      }
      newValue = removeTag(newValue)
      try {
        console.log(newValue)
        await storeFile(`${projectTitle}/src/pages/${pageName}/${pageName}.js`, newValue)
        setFile(null)
        setOpenFileNum(null)
        setOpenFiles([])
      } catch (error) {console.log(error)}
    }
  }

  async function newComponent() {
  }

  function separateNums(inputString) {
    for (let i = 0; i < inputString.length; i++) {
      if (/\d/.test(inputString[i])) {
        return inputString.slice(0, i) + ' ' + inputString.slice(i);
      }
    }
    return inputString;
  }

  // Pages 
  function changePage(value) {
    try {
      const iframe = frameRef.current.querySelector('iframe');
      if (iframe && iframe.contentWindow.history) {
        // Use the history object to navigate within the iframe
        console.log("trying")
        iframe.contentWindow.history.pushState(null, null, `/${value}`);
      } else {
        console.error('Iframe or history not found');
      }
    } catch(error) {console.log(error)}
  }

  async function addPage() {
    // Check if component is already in the stack and rename
    console.log(pageNames)
    let componentName = "Page"

    function sanitizeComponentName(input) {
      try {
        // Remove leading and trailing whitespaces
        let sanitizedInput = input.trim();
    
        // Ensure the name starts with a letter
        if (!/^[a-zA-Z]/.test(sanitizedInput)) {
          throw new Error("Component name must start with a letter.");
        }
    
        // Make first cahracter upper case
        sanitizedInput = sanitizedInput.charAt(0).toUpperCase() + sanitizedInput.slice(1);
        // Replace invalid characters with underscores
        sanitizedInput = sanitizedInput.replace(/[^a-zA-Z0-9_]/g, '_');
    
        return sanitizedInput;
      } catch (error) {
        console.warn("Invalid component name:", error.message);
        return null;
      }
    }
    
    const userInput = window.prompt("Page Name");

    if (userInput) {
      const name = sanitizeComponentName(userInput);

      if (name) {
        // Use the sanitized component name
        console.log("Component Name:", name);
        componentName = name
      } else {
        // Handle the case where the input was invalid
        console.log("Invalid input. Please enter a valid JSX component name.");
      }
    } else {return}

    let originalComponentName = componentName
    if (pageNames.includes(componentName)) {
      let i = 2
      let done = false
      let newName = componentName
      while (!done) {
        newName = componentName + "_" + i
        if (pageNames.includes(newName)) {
          i += 1
        } else {done = true}
      }
      componentName = newName
    }

    let pageNamesCopy = pageNames
    pageNamesCopy.push(componentName)
    setPageNames(pageNamesCopy)
    setUpdateStackNum(updateStackNum + 1)
    console.log(pageNamesCopy)
 
    async function createFileAndAddToFilesArray(componentName) {
      // Create some content for the file (you can modify this based on your needs)
      function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      
      // Example usage:
      const originalString = componentName;
      const capitalizedString = capitalizeFirstLetter(originalString);
      console.log(capitalizedString); // Output: "Hello"
      const fileContent = `import { Link } from 'react-router-dom';
    
      function ${componentName}() {
        return (
          <>
           
          </>
        );
      }
      
      export default ${componentName};
      
      `;
    
      // Convert the content to a Blob
      const blob = new Blob([fileContent], { type: 'text/javascript' });
    
      // Create a new File object
      const filePath = `${projectTitle}/src/pages/${componentName}/${componentName}.js`;
    
      // Use fileUtils function to store the file in IndexedDB
      await storeFile(filePath, blob);
    }
    
    // Call the function
    await createFileAndAddToFilesArray(componentName);

    let found = false
    for (let i=0;i<openFiles.length;i++) {
      if (openFiles[i].path === `${projectTitle}/src/pages/${componentName}/${componentName}.js`) {
        // File is already open
        found = true
        setOpenFileNum(i)
        setFile( openFiles[i] )
      }
    }

    let appjs = null;
    try {
      appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
      if (!found && appjs !== null) {
        await handleFileOpen(`${projectTitle}/src/App.js`)
      }
    } catch {appjs = null}

    if (appjs !== null) {
      let currentCode = appjs

      let importedValues = []
      let imports = currentCode.split("import ")
      if (imports.length > 0) {
        for (let j=0;j<imports.length;j++) {
          let constituents = imports[j].split(" ")
          if (constituents.length > 0) {
            importedValues.push(constituents[0])
          }
        }
      }

      let newValue = currentCode
    
      // If component is not already imported 
      if (!importedValues.includes(componentName)) {
        newValue = `import ${componentName} from './pages/${componentName}/${componentName}.js'` + "\n" + currentCode
      }

      let extension = componentName.toLowerCase()
      function insertRoute(sourceCode, componentName) {
        // Define a regular expression to find the position to insert the component
        const insertPositionRegex = /<Routes\s*>/;
        const match = sourceCode.match(insertPositionRegex);
        let updatedSourceCode = sourceCode
        if (match) {
          
          // Example usage:
          const originalString = componentName;
            
          const insertionIndex = match.index + match[0].length;
            let insertCode = `\n<Route path='/${extension}' element={<${componentName}/>} />`
            updatedSourceCode = sourceCode.slice(0, insertionIndex) + insertCode + sourceCode.slice(insertionIndex);
          }
        return updatedSourceCode
      }
      
        
      // Add the tag to App.js
      newValue = insertRoute(newValue, componentName)
      try {
        await storeFile(`${projectTitle}/src/App.js`, newValue)
        setFile(null)
        setOpenFileNum(null)
        setOpenFiles([])

        console.log(newValue)
        let componentCode = null
        try {componentCode = await retrieveFileByPath(`${projectTitle}/src/pages/${componentName}/${componentName}.js`)
        } catch {componentCode = null}
        
        if (componentCode) {
          let regex = new RegExp(originalComponentName, 'g');
          componentCode = componentCode.replace(regex, componentName);  

          console.log(componentCode)
          setFile(null)
          setOpenFileNum(null)
          setOpenFiles([])

          await handleBuild(newValue)
        }
      
      } catch (error){console.log(error)}
      monacoAutoformat()
      let currentStackCopy = currentStack
      currentStackCopy.push([])
      setCurrentStack(currentStackCopy)
      changePage(extension)
    }
  };

  async function deletePage(index) {
    const isConfirmed = window.confirm(`Delete page ${pageNames[index]}?`);
    if (isConfirmed) {
      // Step 1: Remove import from App.js
      await removePageFromAppJS(pageNames[index])
            
      // Step 2: Delete File
      await deleteFile(`${projectTitle}/src/pages/${pageNames[index]}/${pageNames[index]}.js`)
      
      // Step 3: Update Stack
      stackDeletion(index)
      // keep track of the component files!! don't forget
    }
  }

  async function removePageFromAppJS(componentName) {
    // Alter App.js to remove import 
    let appjs = null;
    try {
      appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
    } catch {appjs = null}

    if (appjs !== null) {
      let currentCode = appjs
      
      function removeImport(inputString) {
        const lines = inputString.split('\n');
        const modifiedLines = lines.filter(line => !line.trim().startsWith(`import ${componentName}`));
        const modifiedString = modifiedLines.join('\n');
        return modifiedString;
      }

      let newValue = removeImport(currentCode)

      // Remove the route
      function removeRoute(inputString) {
        let pathValue = "/" + componentName.toLowerCase()
        const pattern = new RegExp(`<Route\\s+path='${pathValue}'\\s+element={<${componentName}\\/>} \\/>`, 'g');
        return inputString.replace(pattern, '');
      }
      newValue = removeRoute(newValue)
      try {
        console.log(newValue)
        await storeFile(`${projectTitle}/src/App.js`, newValue)
        setFile(null)
        setOpenFileNum(null)
        setOpenFiles([])
      } catch (error) {console.log(error)}
    }
  }

  async function redirect(value) {
    try { await handleBuild('')
    } catch (error){console.log(error)}
    changePage(value)
  };

  function stackDeletion(dataIndex) {
    console.log(pageNames)
    console.log(currentStack)
    let pageNamesCopy = []
    let currentStackCopy = []
    for (let i=0;i<pageNames.length;i++) {
      let dataIndexVal = dataIndex * 1
      if (i !== dataIndexVal) {
        pageNamesCopy.push(pageNames[i])
        currentStackCopy.push(currentStack[i])
      }
    }
    console.log(pageNamesCopy)
    console.log(currentStackCopy)
    setPageNames(pageNamesCopy)
    setCurrentStack(currentStackCopy)
  }

  // Parsing JSX
  function parseChildren(jsx) {
    console.log(jsx)

    function pattern1(inputString) {
      const pattern = /<>/;
      const match = inputString.match(pattern);
    
      if (match) {
        const startIndex = match.index + match[0].length;
        const followingText = inputString.slice(startIndex);
        return followingText;
      } else {
        return inputString;
      }
    }
    
    function pattern2(inputString) {
      const pattern = /<\/>/;
      const match = inputString.match(pattern);
    
      if (match) {
        const endIndex = match.index;
        const precedingText = inputString.slice(0, endIndex);
        return precedingText;
      } else {
        return inputString;
      }
    }
    
    const jsxString = "<div>" + pattern2(pattern1(jsx)) + "</div>" 
    const elementTree2 = parse(jsxString)[0];
    let elements = elementTree2.children
    let children = []
    for (let i=0;i<elements.length;i++) {
      if (elements[i].type === "tag") {children.push(elements[i])}
    }
    return children
  }

  // Deployment
  const handleDeployment = async () => {
    console.log("Starting deployment")
    setDeploymentText("Deploying...")
    let files = await getFilesFromIndexedDB()
    let response = await sendFilesToServer(files)
  }

  async function getFilesFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReactProjectsDatabase'); 
  
      request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['files'], 'readonly');
          const objectStore = transaction.objectStore('files');
          const files = [];
          const cursorRequest = objectStore.openCursor();
      
          cursorRequest.onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                  const file = cursor.value;
                  if (!file.filepath.includes("/node_modules")) {
                      files.push(file);
                  }
                  cursor.continue();
              } else {
                  resolve(files);
              }
          };
      
          cursorRequest.onerror = (e) => {
              reject(e.target.error);
          };
      }
  
      request.onerror = (event) => {
          reject(event.target.error);
      };
    });
  }

  async function sendFilesToServer(files) {
    try {
      const formData = new FormData();
      files.forEach((fileObj, index) => {
        const filePath = fileObj.filepath
        const file = new File([fileObj.content], filePath);

        const pathParts = filePath.split('/');
        const fileName = pathParts.pop();
        const relativePath = pathParts.join('/');

        formData.append("file", file);
        formData.append("filenames", `${relativePath}/${fileName}`);
      });

      // const socket = new WebSocket('ws://localhost:3001');

      // socket.onopen = () => {
      //   console.log('WebSocket connection opened.');
      // };

      // socket.onmessage = (event) => {
      //   console.log('Message from server:', event.data);
      // };

      // socket.onclose = (event) => {
      //   console.log('WebSocket connection closed:', event);
      // };
    
      const response = await fetch(`${server}/upload-files`, {
      // const response = await fetch('https://reactaiplayground.azurewebsites.net/upload-files', {
        method: 'POST',
        body: formData,
      });
    
      if (response.ok) {
        console.log('Deployment successful');
        setDeploymentText("Deploy")
        response.text().then(text => {
          console.log(text);
          window.open(text, '_blank');
          alert(text)
        });
      } else {
        console.error('Error sending files to the server.');
        console.log(response) 
        setDeploymentText("Deploy")
      }
    } catch (error) {
        console.error('An error occurred:', error);
        setDeploymentText("Deploy")
    }
  }

  // Element Tree
  let fakeComponent = `
  import './Navbar2_2.css';

  const Navbar2_2 = () => {
    return (
      <>
      <nav className="navbar2">
        <div className="logo-container2">
          <img
            src="https://images.unsplash.com/photo-1633409361618-c73427e4e206?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJyYW5kfGVufDB8fDB8fHww&auto=format&fit=crop&w=900&q=60" alt="Logo" className="logo2" />
            <img
            src="https://images.unsplash.com/photo-1633409361618-c73427e4e206?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGJyYW5kfGVufDB8fDB8fHww&auto=format&fit=crop&w=900&q=60" alt="Logo" className="logo2" />

        </div>
        <ul className="nav-list2">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About Us</a></li>
          <li><a href="#services">Our Services</a></li>
          <li><a href="#portfolio">Portfolio</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      <div>
        <a href="">  Hi  </a>  
        <p></p>
        <p></p>

       </div>  

       <div>
       <a href="">  Hi  </a>  
       <a href="">  Hi  </a>  
       <a href="">  Hi  </a>  

      </div>  
     
      </>
    );
  }

  export default Navbar2_2;
  `

  async function handleCreateElementTree(index, autoSelect, cssObject) {
    // Parse the current component
    let file = fakeComponent

    try {
      file = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][index]}/${currentStack[currentPage][index]}.js`)
    } catch (error) {console.log(error); return}

    let parsedComponent = parseChildren(file)
    console.log(parsedComponent)
    
    // Remove white space objects from the tree
    function removeTextNodes(component) {
      let tree = component
      for (let i = 0; i < tree.length; i++) {
          const node = tree[i];
  
          if (node.type === 'text' && node.content.trim() === "") {
              // If the current node is of type "text", remove it from the array
              tree.splice(i, 1);
              i--; // Adjust the index to account for the removed element
          } else if (node.children && node.children.length > 0) {
              // If the current node has children, recursively call the function on its children
              removeTextNodes(node.children);
          }
      }
      return tree
    }

      // OR remove all text from the tree
    function removeAllTextNodes(component) {
      let tree = component
      for (let i = 0; i < tree.length; i++) {
          const node = tree[i];
  
          if (node.type === 'text') {
              // If the current node is of type "text", remove it from the array
              tree.splice(i, 1);
              i--; // Adjust the index to account for the removed element
          } else if (node.children && node.children.length > 0) {
              // If the current node has children, recursively call the function on its children
              removeAllTextNodes(node.children);
          }
      }
      console.log(tree)
      return tree
    }   

    // Cleaned from whiteSpace
    // let cleanTree = removeTextNodes(parsedComponent)
    // console.log(cleanTree)
    
    let noTextTree = removeAllTextNodes(parsedComponent)
    setElementObjectTree(noTextTree)
 
    // Begin to reconstruct object tree in correct format
    let displayTree = {"Component": {}}
    let firstPath = ""
    async function buildTree(node, parent) {
      let name = node.name;

      // Auto select first item if just clicked a component
      if (firstPath === "" && autoSelect) {
        firstPath = "Component/" + node.name
        await autoFirstSelect(firstPath, node.children, cssObject, index)
      }

      if (node.children && node.children.length > 0) {
        let counter = 1;
        while (parent[name]) {
          name = node.name + '*'.repeat(counter);
          counter++;
        }
        parent[name] = {};
        for (let i = 0; i < node.children.length; i++) {
          buildTree(node.children[i], parent[name]);
        }
      } else {
        if (name === undefined && node.type === "text") {name = "Text";}

        // Check for existing siblings with the same name
        let counter = 1;
        while (parent[name]) {
          name = node.name + '*'.repeat(counter);
          counter++;
        }

        parent[name] = true;
      }
    }

    for (let i = 0; i < noTextTree.length; i++) {
      buildTree(noTextTree[i], displayTree["Component"]);
    }

    // Set the element tree, correct according to the format required by tree display
    setElementTree(displayTree)
    return displayTree
  }

  function removeAsterisks(inputString) {
    return inputString.replace(/\*/g, '');
  }

  async function saveEdits(newText) {

    let file = ""
    try {file = await retrieveFileByPath(`${projectTitle}/src/components/${currentStack[currentPage][currentComponentIndex]}/${currentStack[currentPage][currentComponentIndex]}.js`);
    } catch (error) {console.log(error);}
    if (file === "") {return}
    console.log(file)
    let componentArray = await componentMapped(file);
    console.log(componentArray)
    let relaventIndex = await locateCorrectIndex(componentArray, currentElementPath)
    
    let newCode = file
    let newArray = componentArray
    // Editing text
    if (showAddTextInput) {
      newArray = await editTextData(componentArray, relaventIndex)
      console.log(newArray)
    } 
    
    // Editing image
    if (showImgSRCInput) {
      console.log("editing an image")
      console.log(componentArray)
      newArray = await editImgSRC(componentArray, relaventIndex, newText)
      console.log(newArray)
    }

    // Editing a tag
    if (showaTagInput) {
      newArray = await editaTag(componentArray, relaventIndex)
    }

    // Editing a link
    if (removeAsterisks(currentElementPath.split("/").pop()) === "Link") {
      newArray = await editLinkTag(componentArray, relaventIndex)
    }

    // Adding a link
    if (linkActive) {
      newArray = await addLinkTag(componentArray, relaventIndex)
      let found = false
      for (let i=0;i<newArray.length;i++) {
        if (newArray[i].includes("import { Link") || newArray[i].includes("import {Link")) {found = true}
      }
      if (!found) {newArray[0] = `import { Link } from "react-router-dom"\n` + newArray[0]}
    }

    // adding an a tag
    if (aTagActive && selectingaTagInputValue.trim() !== "") {
      newArray = await addaTag(componentArray, relaventIndex)
    }

    newCode = reassembleCode(newArray)
    console.log(newCode)

    // CSS EDITS 
    if (1 === 1) {
      let currentCSSFileObjectCopy = currentCSSFileObject
      
      let idsArray = Object.keys(currentCSSIDsObject)
      for (let i=0;i<idsArray.length;i++) {
        currentCSSFileObjectCopy[idsArray[i]] = currentCSSIDsObject[idsArray[i]]
      }

      let classesArray = Object.keys(currentCSSClassesObject)
      for (let i=0;i<classesArray.length;i++) {
        currentCSSFileObjectCopy[classesArray[i]] = currentCSSClassesObject[classesArray[i]]
      }
  
      // Reassemble CSS
      let newCSS = "";
      for (const [key, value] of Object.entries(currentCSSFileObjectCopy)) {
        let valueString = value.join(';') 
        if (value.length > 0) {valueString += ";"}
        newCSS += `${key} { ${valueString} \n}`;
      }
      
      // Safe Store CSS
      // Safe update
      await expandElementTree()
      await safeStoreX2(`${projectTitle}/src/components/${currentStack[currentPage][currentComponentIndex]}/${currentStack[currentPage][currentComponentIndex]}.js`, newCode, file, `${projectTitle}/src/components/${currentStack[currentPage][currentComponentIndex]}/${currentStack[currentPage][currentComponentIndex]}.css`, newCSS, currentCSSFile)
    } else {
      await expandElementTree()
      await safeStore(`${projectTitle}/src/components/${currentStack[currentPage][currentComponentIndex]}/${currentStack[currentPage][currentComponentIndex]}.js`, newCode, file)
    }

    // Link was edited
    if (linkActive) {   
      console.log("NEW TREE")
      let createdTree = await handleCreateElementTree(currentComponentIndex, false, {})
      console.log(createdTree)
      setCount1(count1 + 1)

      // Set element tree to full open
      function getAllPaths(obj, currentPath = '') {
        let paths = [];
      
        for (let key in obj) {
          let newPath = currentPath ? `${currentPath}/${key}` : key;
      
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            // If the current value is an object, recursively call the function
            paths.push(newPath);
            paths = paths.concat(getAllPaths(obj[key], newPath));
          } else {
            // If it's a leaf node (non-object), add the path to the array
            paths.push(newPath);
          }
        }
      
        return paths;
      }
      let pushObject = {}
      let paths = getAllPaths(createdTree)
      for (let j=0;j<paths.length;j++) {
        pushObject[paths[j]] = true
      }
      setExpandedElementNodes(pushObject)
    }

     // a Tag was added
     if (aTagActive) {   
      console.log("NEW TREE")
      let createdTree = await handleCreateElementTree(currentComponentIndex, false, {})
      console.log(createdTree)
      setCount1(count1 + 1)

      // Set element tree to full open
      function getAllPaths(obj, currentPath = '') {
        let paths = [];
      
        for (let key in obj) {
          let newPath = currentPath ? `${currentPath}/${key}` : key;
      
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            // If the current value is an object, recursively call the function
            paths.push(newPath);
            paths = paths.concat(getAllPaths(obj[key], newPath));
          } else {
            // If it's a leaf node (non-object), add the path to the array
            paths.push(newPath);
          }
        }
      
        return paths;
      }
      let pushObject = {}
      let paths = getAllPaths(createdTree)
      for (let j=0;j<paths.length;j++) {
        pushObject[paths[j]] = true
      }
      setExpandedElementNodes(pushObject)
    }

    setLinkActive(false)
    setaTagActive(false)
    setaTagInputValue("")
  }

  // UNSPLASH 
  // async function returnIMGArray(searchTerm) {
  //   console.log("Fetching SRCs...")
  //   let results = await returnSRC("ship")
  //   console.log(results)
  //   // Break up array into sub pages
  //   // let dividedArray = []
  //   // let currentDivision = []
  //   // let marker = 0
  //   // for (let i=0;i<results.length;i++) {
  //   //   if (i % 30 === 0) {marker = i + 29}
  //   //   currentDivision.push(results[i])
  //   //   if (i === marker) {
  //   //     dividedArray.push(currentDivision)
  //   //     currentDivision = []
  //   //   }
  //   // }
  //   // console.log(dividedArray)
  // }

  // async function returnSRC(searchTerm, page = 1, maxPages = 1) {
  //   const perPage = 3;
  //   const url = `https://api.unsplash.com/search/photos?query=${searchTerm}&per_page=${perPage}&page=${page}`;
  //   const accessKey = "wLQzfc9mgrvUWYLH9MQ7iWgMc0vlLWU-1uM1Cdz_ARI";
  //   const headers = { 'Authorization': `Client-ID ${accessKey}` };

  //   try {
  //       // Check if the maximum number of pages has been reached
  //       if (page > maxPages) {
  //           return [];
  //       }

  //       // Send a GET request to the Unsplash API
  //       const response = await axios.get(url, { headers });

  //       // Check if the request was successful (status code 200)
  //       if (response.status === 200) {
  //           // Parse the JSON response
  //           const data = response.data;

  //           // Check if there are any results
  //           if ('results' in data && data.results.length > 0) {
  //               // Extract image URLs
  //               const results = data.results.map(result => result.urls.raw);

  //               // Check if there are more pages
  //               if (data.total_pages > page) {
  //                   // Fetch the next page of results
  //                   const nextPageResults = await returnSRC(searchTerm, page + 1, maxPages);
  //                   return results.concat(nextPageResults);
  //               } else {
  //                   return results;
  //               }
  //           } else {
  //               return [];
  //           }
  //       } else {
  //           return [];
  //       }
  //   } catch (error) {
  //       console.error(error);
  //       return [];
  //   }
  // }


  // UNSPLASH IMAGES
 
  async function getUnsplashRandomImageUrl(size, term) {
    try {
      let fetchTerm = unsplashBase
      if (size !== "") {fetchTerm += size}
      if (term !== "") {fetchTerm += "?" + term}
      const response = await fetch(fetchTerm);

      // Check if the response is a redirect
      if (!response.url.startsWith('https://source.unsplash.com/random')) {
        const finalImageUrl = response.url;
        return finalImageUrl;
      } else {
        console.error('No redirect found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching Unsplash image:', error);
      return null;
    }
  }

  async function refreshIMGArray() {
    setBuildingSRCArray(true)
    const container = document.getElementById("lottie-container-2"); 
    let animation = ""
    if (container) {
      animation = lottie.loadAnimation({
        container: container,
        animationData: animationData1, 
        renderer: 'svg', 
        loop: true,
        autoplay: true, 
      });
    }

    if (currentIMGSearchTerm === "") {return}
    else {
      let addedImages = []
      for (let i=0;i<20;i++) {
        let result = await getUnsplashRandomImageUrl("", currentIMGSearchTerm)
        if (result !== null && !addedImages.includes(result)) {addedImages.push(result)}
      }
      setCurrentSRCArray(addedImages)
      setCurrentIMGSearchTerm("")
      setBuildingSRCArray(false)
      if (container) {animation.destroy();}
    }
  }

  // Safe Building 
  async function safeStore(path, code, originalCode) {
    try {
      await storeFile(path, code)
      try {
        console.log("TEST BUILD...")
        await safeBuild("")
        console.log("SUCCESSFUL BUILD...")
      } catch(error) {
        console.log("FAIL -> STORING ORIGINAL FILE...")
        await storeFile(path, originalCode)
        setIsSubmitting(false)
        setCanCloseWarning(true)
        setDisplayWarningProgress(false)
        setFirstBuild(false);
      }
    } catch(error) {
      console.log("Error storing first file", error)
    }
  }

  async function safeStoreX2(path, code, originalCode, path2, code2, originalCode2) {
    try {
      await storeFile(path, code)
      await storeFile(path2, code2)
      try {
        console.log("TEST BUILD...")
        await safeBuild("")
        console.log("SUCCESSFUL BUILD...")
      } catch(error) {
        console.log("FAIL -> STORING ORIGINAL FILE...")
        await storeFile(path, originalCode)
        await storeFile(path2, originalCode2)
        setIsSubmitting(false)
        setCanCloseWarning(true)
        setDisplayWarningProgress(false)
        setFirstBuild(false);
      }
    } catch(error) {
      console.log("Error storing first file", error)
    }
  }

  const safeBuild = async (appJSCode) => {
    
      // restore the stack
      try {
        let appJS = ""
        if (typeof appJSCode === "string") {
          appJS = appJSCode
          console.log(appJS)
        }
        else {
          appJS = await retrieveFileByPath(`${projectTitle}/src/App.js`);
        }
      } catch (error) {
        console.log(error)
      }

      console.log("getting file paths")
      let filePaths = await retrieveFilePaths()
      if (firstBuild) {
        setWarning(true)
        filePaths = await retrieveFilePaths2()
      } else {filePaths = await retrieveFilePaths();}
      console.log("got file paths")
      console.log(filePaths)
      let fileTree = await retrieveFileTree();
      console.log("got file tree")
      console.log(fileTree)
      let projectName = filePaths[0].split("/")[0];

      if (firstBuild || blankSlate) {
        let packageJson = await retrieveFileByPath(`${projectTitle}/package.json`);
        let packageDependencies = JSON.parse(packageJson).dependencies;
        let packageQueue = Object.entries(packageDependencies)
        let packageData = {}

        let step = 0;
        while (packageQueue.length) {
          let [packageName, packageVersion] = packageQueue.pop();
          if (packageName in (fileTree[projectName]['node_modules'] || {})) {
            console.log(`${packageName} is already installed, skipping...`)
            continue
          }
          if (packageName in packageData) { continue }
          if (packageName === 'react-scripts') { continue }
        
          step += 1
          // if (step % 2 === 0 && blankSlate) {
            setStoringProgress((step/18) * 100)
          // }
          console.log(`Fetching package data for ${packageName}...`);
          let response = await fetch(`https://registry.npmjs.org/${packageName}`);
          let data = await response.json();
          let versions = Object.keys(data.versions);
          let version = semver.maxSatisfying(versions, packageVersion);
        
          packageData[packageName] = data.versions[version];
          let dependencies = data.versions[version].dependencies;
          for (let dependency in dependencies) {
        packageQueue.push([dependency, dependencies[dependency]])
          }
        }
        
        for (let packageName in packageData) {
          step += 1
          setStoringProgress((step/18) * 100)
          console.log(`Installing ${packageName}`)
          let tarballURL = packageData[packageName].dist.tarball;
          let packageFiles = await fetch(tarballURL)
        .then(stream => stream.body.pipeThrough(new window.DecompressionStream("gzip")))
        .then(stream => new Response(stream).arrayBuffer())
        .then(stream => untar(stream));
        
          for (let file of packageFiles) {
        let path = file.name.replace(/^package\//, `${projectName}/node_modules/${packageName}/`);
        if (!path.startsWith(`${projectName}`)) {path = `${projectName}/node_modules/` + path}
        await storeFile(path, file.blob);
          }
        }
      }


      // let packageJsons = filePaths.filter(x => x.startsWith(`${projectName}/node_modules/`) && x.endsWith('/package.json')).slice(0, 10);
      // console.log(`Parsing ${packageJsons.length} package.json files`);
      
      // let mainFilePaths = [];
      // for (let packageJson of packageJsons) {
      //   let modulePath = path.dirname(packageJson);
      //   let module = modulePath.slice(`${projectName}/node_modules/`.length)
      //   try {
      //     let packageJsonData = await retrieveFileByPath(packageJson);
      //     let mainPath = JSON.parse(packageJsonData).main;
      //     if (!mainPath) {
      //       continue;
      //     }
      //     try {
      //       let mainAbsPath = path.join(modulePath, mainPath);
      //       mainAbsPath = await resolvePath(fileTree, mainAbsPath);
      //       await retrieveFileByPath(mainAbsPath)
      //       mainFilePaths.push(mainAbsPath)
      //     } catch {
      //       console.log(`Couldn't find main file at ${path.join(modulePath, mainPath)} for module ${module}, skipping...`);
      //       continue;
      //     }
      //   } catch {
      //     console.log(`Couldn't find package.json for module ${module}, skipping...`);
      //     continue;
      //   }
      // };

      // console.log("Done scanning package.json files")

      let reactRegex = /import\s+React(?:\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\})?\s+from\s+['"]react['"]/;

      let srcFiles = filePaths.filter(x => x.startsWith(`${projectName}/src/`) && (x.endsWith('.js') || x.endsWith('.jsx')));
      let modules = [];
      for (let filePath of srcFiles) {
        let fileData = await retrieveFileByPath(filePath)
        let moduleCode =  Babel.transform(fileData, { presets: [["env", {"modules": false}], "react"] }).code;
        if (!reactRegex.test(moduleCode)) {
          moduleCode = 'import React from "react";\n' + moduleCode;
        }
        modules.push({
          name: filePath,
          code: moduleCode,
          isEntry: filePath === `${projectName}/src/index.js`
        });
      }

      let moduleById = {};
      modules.forEach(module => {
        moduleById[module.name] = module;
      });

      let inputOptions = {
        input: [`${projectName}/src/index.js`],
        plugins: [{
          resolveId (importee, importer) {
            // console.log("IMPORTING FILE", importer, importee);
            let fileType = importee.split('.').slice(-1)[0];
            if (!importer) return importee;
            if (importee in moduleById) return importee;
            if (importee[0] !== '.') return false;
            if (fileType in staticFileTypes) return false;

            let filePath = path.join(path.dirname(importer), importee);
            let resolved = resolvePath(fileTree, filePath);
            if (!(resolved in moduleById)) {
              throw new Error(`Could not resolve '${importee}' from '${importer}'`);
            }
            return resolved;
          },
          load: function (id) {
            return moduleById[id].code;
          }
        }],
      }

      let rolledUp = await rollup.rollup(inputOptions);
      let bundle = await rolledUp.generate({});
      let bundleCode = bundle.output[0].code;
      // console.log("BUNDLE");
      // console.log(bundle.output[0]);
      // console.log(bundle.output[0].code);

      let staticDependencies = {}
      let bundleDependencies = {}
      for (let name of bundle.output[0].imports) {
        let fileType = name.split('.').slice(-1)[0]
        if (fileType in staticFileTypes) {
          staticDependencies[name] = { type: fileType };
        }
        else {
          let modulePath = await resolvePackage(fileTree, path.join(projectName, 'node_modules', name));
          bundleDependencies[modulePath] = [name];
        }
      };
  
      let dependencies = {};
      for (let key in bundleDependencies) {
        dependencies[key] = [...bundleDependencies[key]];
      }
      let dependencyQueue = Object.keys(dependencies);
      while (dependencyQueue.length) {
        let fileName = dependencyQueue.shift();
        let contents = await retrieveFileByPath(fileName);
        let regexp = /require\(['"](.+?)['"]\)/g
        let results = contents.matchAll(regexp);
        for (let result of results) {
          let requirePath;
          try {
            // Check if the dependency is a node submodule (local node_modules)
            requirePath = path.join(path.dirname(fileName), result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          } catch {
            // Fall back to the top-level node_modules
            requirePath = path.join(projectName, 'node_modules', result[1]);
            requirePath = await resolvePackage(fileTree, requirePath);
            await retrieveFileByPath(requirePath);
          }
          if (!(requirePath in dependencies)) {
            dependencyQueue.push(requirePath);
            dependencies[requirePath] = [];
          }
          dependencies[requirePath].push(result[1]);
        }
      }

      // Deduplicate
      for (let key in dependencies) {
        dependencies[key] = Array.from(new Set(dependencies[key]));
      }

      console.log("Done creating dependency tree");
      console.log(dependencies);

      let code = dedent`\n
        var __modules__ = {};
        function define(names, module) {
          for (var i = 0; i < names.length; i++) {
            __modules__[names[i]] = {value: null, init: module};
          }
        }
        function require(name) {
          if (!__modules__[name]) {
            throw new Error("module " + name + " could not be imported");
          }
          else if (!__modules__[name].value) {
            __modules__[name].value = __modules__[name].init();
          }
          return __modules__[name].value;
        }
      `

      for (let key in dependencies) {
        let moduleCode = await retrieveFileByPath(key);
        let moduleNames = dependencies[key].map(name =>`"${name}"`).join(', ')
        code += dedent`\n
          define([${moduleNames}], function() {
            var exports = {};
            var module = {exports: exports};
          ` + moduleCode + dedent`\n
            return module.exports;
          });
        `;
      }

      for (let key in staticDependencies) {
        let fileType = staticDependencies[key].type;
        let fileData = await retrieveFileByPath(key, binaryFileTypes.includes(fileType));
        let body = "return null;";
        if (fileType in staticFileTypes) {
          body = staticFileTypes[fileType](fileData);
        }
        code += dedent`\n
          define(["${key}"], function() {
            ${body}
          });
        `;
      }

      let simpleImportRegex = /import\s+['"](.*?)['"];/g;
      let defaultImportRegex = /import\s+([A-Za-z0-9$_]+?)\s+from\s+['"](.*?)['"];/g;
      let destructuringImportRegex = /import\s+\{\s*([A-Za-z0-9$_, ]+?)\s*\}\s+from\s+['"](.*?)['"];/g;
      let combinedImportRegex = /import\s+([A-Za-z0-9$_]+?)\s*,\s*\{\s*([A-Za-z0-9$_,\s]+?)\s*\}\s+from\s+['"](.*?)['"];/g;

      let importCode = ''
      for (let result of bundleCode.matchAll(simpleImportRegex)) {
        importCode += `\nrequire("${result[1]}");\n`;
      }
      for (let result of bundleCode.matchAll(defaultImportRegex)) {
        importCode += `\nvar ${result[1]} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(destructuringImportRegex)) {
        importCode += `\nvar {${result[1]}} = require("${result[2]}");\n`;
      }
      for (let result of bundleCode.matchAll(combinedImportRegex)) {
        importCode += dedent`\n
          var ${result[1]} = require("${result[3]}");
          var {${result[2]}} = require("${result[3]}");
        `;
      }

      bundleCode = bundleCode.replaceAll(simpleImportRegex, '');
      bundleCode = bundleCode.replaceAll(defaultImportRegex, '');
      bundleCode = bundleCode.replaceAll(destructuringImportRegex, '');
      bundleCode = bundleCode.replaceAll(combinedImportRegex, '');
      bundleCode = bundleCode.trim();
      bundleCode = importCode + bundleCode;

      code += bundleCode;
      const indexHTML = getIndexHTML(code);
      if (code.length > 0) {
        setWarning(false)
      }

      const iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0'); // Change from '100%' to '0' for frameborder
      frameRef.current.innerHTML = '';
      frameRef.current.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(indexHTML);
      iframe.contentWindow.document.close();

      // Access the iframe content and attach click event listener
      // const iframeContent = iframe.contentWindow.document
      // iframeContent.body.addEventListener('click', (event) => {
      //   console.log("clicked screen")
      //   console.log(event.screenY)
      //   const componentName = event.target.getAttribute('data-component-name');
      //   if (componentName) {
      //     console.log(event)
      //   }
      // }, true);

      clearUserPrompt();
      setPrompt("")
      setLineEditOperation({})
      setIsSubmitting(false)
      setCanCloseWarning(true)
      setDisplayWarningProgress(false)
      setFirstBuild(false);

      setStoringProgress(0)
      setProgress(0)

      // New App? -> Build Mode 
      if (clickedNewApp) {
        setBuildMode(true);     
        setBuildingStack(true)
      }
      setClickedNewApp(false)
      let extension = pageNames[currentPage].toLowerCase()
      if (pageNames[currentPage] === "Home") {extension = ""}
      changePage(extension)

      return projectName
  }

  // CSS Editing
  function createCSSObject(cssFile) {
    let cssObject = {}
    let lookingForOpenBracket = true
    let currentObjectName = ""
    let currentObjectAttributes = ""
    for (let i=0;i<cssFile.length;i++) {
      let c = cssFile[i]

      if (lookingForOpenBracket) {
        if (c === "{") {
          lookingForOpenBracket = false
        } else {
          currentObjectName += c
        }
      } else {
        if (c === "}") {
          lookingForOpenBracket = true
          let array = currentObjectAttributes.split(";")
          array.pop(-1)
          cssObject[currentObjectName] = array
          currentObjectName = ""
          currentObjectAttributes = ""
        } else {
          currentObjectAttributes += c
        }
      }
    }
    console.log(cssObject)
    setCurrentCSSFileObject(cssObject)
    return cssObject
  }

  function getStringWidth(text, fontSize, fontFamily) {
    // Create an invisible element
    const invisibleElement = document.createElement('span');
    invisibleElement.style.visibility = 'hidden';
    invisibleElement.style.fontSize = fontSize;
    invisibleElement.style.fontFamily = fontFamily;
    invisibleElement.style.position = 'absolute';
    invisibleElement.style.whiteSpace = 'nowrap';
  
    // Set the text content
    invisibleElement.textContent = text;
  
    // Append the element to the document body
    document.body.appendChild(invisibleElement);
  
    // Get the width of the invisible element
    const width = invisibleElement.offsetWidth;
  
    // Remove the invisible element from the DOM
    document.body.removeChild(invisibleElement);
  
    return width;
  }

  function resetCSSPopup() {
    setShowPopup(false)
    setShowAddCSSAttribute1(false)
    setShowAddCSSAttribute2(false)
    setCurrentCSSItemIndex(null)
    setShowCSSAttributeList(false)
    setCSSInputValue("")
    setFilteredList([])
    setAttribute1("")
    setAttribute2("")
    setCSSEditingType("")
  }
  
  async function addCSSComplete(item, classType) {
    if (classType) {
      let classesCopy = currentCSSClassesObject
      classesCopy[item].push("\n  " + attribute1 + ": " + attribute2.trim())
      setCurrentCSSClassesObject(classesCopy)
      setCount1(count1 + 1)
    } else {
      let IDsCopy = currentCSSIDsObject
      IDsCopy[item].push("\n  " + attribute1 + ": " + attribute2.trim())
      setCurrentCSSIDsObject(IDsCopy)
      setCount1(count1 + 1)
    }

    resetCSSPopup()
    await saveEdits("")
  }

  // Links
  const handleDropdownChange = (event) => {
    let selectedValue = event.target.value;
    if (selectedValue === "home") {selectedValue = ""}
    setCurrentLink(selectedValue);
  };

  const handleDropdownChoiceChange = (event) => {
    let selectedValue = event.target.value;
    if (selectedValue === "home") {selectedValue = ""}
    setCurrentLinkChoice(selectedValue);
  };


  function extractLink(inputString) {
    const regex = /to=["'](.*?)["']/g;
    const matches = [];
    let match;
  
    while ((match = regex.exec(inputString)) !== null) {
      matches.push(match[1]);
    }
    if (matches.length > 0) {return matches[0]}
    return inputString
  }

  return (
    <div style={{width: "100vw", marginTop: "60px", height: "calc(100vh - 60px)", position: "fixed"}}>
      
      {/* Alert Message */}
      {warning && canShowWarning && <div style={{position: "absolute", height: "100%", width: "100vw", zIndex: 999}}>
        <div style={{pointerEvents: warning? "none" : "all", position: "absolute", height: "100%", width: "100%", backgroundColor: "black", opacity: 0.8}}></div>
        <div style={{position: "absolute", height: "100%", width: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
          <OutsideClickDetector onOutsideClick={() => {handleOutsideClick()}}>
            <div style={{position: "relative", marginTop: "-15vh", height: "260px", width: "400px", borderRadius: "15px", backgroundColor: "black", border: "1px solid white", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "4px"}}>
              {canCloseWarning && <div className="hover-dim" style={{position: "absolute", top: "10px", right: "10px", cursor: "pointer"}} onClick={()=>{setWarning(false); setWarningText3("")}} ><IoClose color="white" size={35}/></div>}
              <div style={{width: "80%", color: "white", fontSize: "30px", fontWeight: "bold", textAlign: "center"}}>
                {warningText1}
              </div>
              <div style={{width: "80%", color: "#999", fontSize: "20px", fontWeight: "100", textAlign: "center"}}>
                {warningText2}
              </div>
              {displayWarningProgress && <div style={{width: "76%", margin: "3px 0"}} className="progress-bar">
                <div className="progress" style={{ width: `${storingProgress}%` }}>
                </div>
              </div>}
              <div style={{width: "80%", color: "white", fontSize: "20px", fontWeight: "100", textAlign: "center"}}>
                {warningText3}
              </div>
            </div>
          </OutsideClickDetector>
        </div>
      </div>}

      {/* Clean Up */}
      <div style={{position: "absolute", height: "24.5px", width: "20px", right: "50vw", zIndex: 9, backgroundColor: "black"}}>
      </div>          

      {/* Settings Window */}
      {dotsOpen &&  <OutsideClickDetector onOutsideClick={() => {handleOutsideClick2()}}>
        <div style={{position: "absolute", right: 0, height: "calc(100% - 41px)", width: "50%", bottom: "41px", backgroundColor: "black", borderLeft: "1px solid white", zIndex: 998, display: "flex", flexDirection: "column", gap: "10px", padding: "20px 17px", paddingTop: "30px"}}>
          <div className="hover-dim" style={{position: "absolute", top: "10px", right: "10px", cursor: "pointer"}} onClick={()=>{setDotsOpen(false)}} ><IoClose color="white" size={35}/></div>
          
          <div style={{color: "white", fontSize: "28px", fontWeight: "600"}}>Your Project</div>     
         
          <div style={{width: "100%", marginBottom: "8px"}}>
            <button style={{width: "100%", whiteSpace: "nowrap", padding: "5px 10px", border: "1px solid white", color: "white", borderRadius: "7px", fontSize: "14px"}} 
              className="prompt-button hover-dim"
              onClick={()=>{handleDeployment()}}>
                {deploymentText}
                {displayWarningProgress && <div style={{ width: "100%", margin: "3px 0"}} className="progress-bar">
                <div className="progress" style={{ width: `${progress}%` }}>
                </div>
                </div>}
            </button> 
          </div>

          <div style={{width: "100%"}}>
            <button style={{width: "100%", whiteSpace: "nowrap", padding: "5px 10px", border: "1px solid white", color: "white", borderRadius: "7px", fontSize: "14px"}} 
              className="prompt-button hover-dim"
              onClick={()=>{handleExport()}}>
                {exportText}
                {displayWarningProgress && <div style={{ width: "100%", margin: "3px 0"}} className="progress-bar">
                <div className="progress" style={{ width: `${progress}%` }}>
                </div>
                </div>}
            </button> 
          </div>
     

          <div style={{marginTop: "15px", color: "white", fontSize: "16px", fontWeight: "400"}}>Current Model</div>     
         
          <button style={{whiteSpace: "nowrap",padding: "5px 10px", border: "1px solid white", color: "white", borderRadius: "7px", fontSize: "14px"}} 
            className="prompt-button hover-dim"
            onClick={()=>{switchModel()}}>
             gpt-{GPTModel}
          </button> 

          <div style={{marginTop: "15px", color: "white", fontSize: "16px", fontWeight: "400"}}>Model Renders</div>     
         
         <button style={{whiteSpace: "nowrap",padding: "5px 10px", border: "1px solid white", color: "white", borderRadius: "7px", fontSize: "14px"}} 
           className="prompt-button hover-dim"
           onClick={()=>{
              let maxLimit = 4;
              if (numberOfRenders >= maxLimit) {
                setRenderButtonWidths("100%")
                setNumberOfRenders(1)
              } else { 
                if (numberOfRenders === 1) {setRenderButtonWidths("50%")}
                else if (numberOfRenders === 2) {setRenderButtonWidths("33.33%")}
                else if (numberOfRenders === 3) {setRenderButtonWidths("25%")}
                setNumberOfRenders(numberOfRenders + 1) 
              }

            }}>
             <p style={{fontSize: "16px"}}>{numberOfRenders}</p>
         </button> 
         

         <div style={{marginTop: "15px", color: "white", fontSize: "16px", fontWeight: "400"}}>Model Temperature</div>     
         
         <button style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "7px", flexDirection: "row", whiteSpace: "nowrap", padding: "5px 10px", border: "1px solid white", color: "white", borderRadius: "7px", fontSize: "14px"}} 
           className="prompt-button hover-dim"
           onClick={()=>{
              if (modelTemperature >= 0.9) {
                setModelTemperature(0.1)
              } else { 
                setModelTemperature(parseFloat((modelTemperature + 0.1).toFixed(1)));
              }
           }}>
            <p style={{marginTop: "-1px", fontSize: "16px"}}>{modelTemperature}</p>
            <p style={{fontSize: "13px", color: "#888"}}>{modelTemperature > 0.6? "HIGH" : modelTemperature > 0.3? "MODERATE" : "LOW"}</p>
         </button> 

        </div>
      </OutsideClickDetector>}

       {/* Options Window */}
       {optionsOpen &&  <OutsideClickDetector onOutsideClick={() => {handleOptionsOutsideClick()}}>
        <div style={{position: "absolute", left: "5px", height: "45px", width: "140px", bottom: "40px", backgroundColor: "black", border: "1px solid white", borderRadius: "13px", zIndex: 998, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "1.5px"}}>

          <button style={{ width: "100%", height: "100%", backgroundColor: "white", whiteSpace: "nowrap",padding: "6px 10px", color: "white", borderRadius: "10px", fontSize: "14px"}} 
            className="prompt-button hover-dim"
            onClick={async () => {
              setStoringProgress(0)
              setProgress(0)
              if (window.confirm('Create New Project?')) {
                // Blank Slate Protocol
                setCanCloseWarning(false)
                setWarning(true)
                setWarningText1("Building Project...")
                setWarningText2("Please wait, this may take a moment...")
                setDisplayWarningProgress(true)
                blankSlate = true;
                setOptionsOpen(false)

                setOpenFileNum(null); 
                currentFile = null
                setFile(null)
                setOpenFiles([])
                setSidebar(false)

                await handleBlankSlate()
                setSlate(1)
                blankSlate = false;
                setWarning(false)
                setDisplayWarningProgress(false)

                // Automatically exit full screen
                setFullScreen(false)
                setFullScreenText("Full Screen")

                // Initialize Build Mode
                setBuildingStack(true)
                setBuildModeStack(true)
                setSidebar(true)
              }
            }}>
              <p style={{fontSize: "16px", color: "black", fontWeight: "bold"}}>New Project</p>
                
          </button> 

        </div>
      </OutsideClickDetector>}

      {/* Left Sidbar */}
      <div 
        onClick={() => { 
          if (fullScreen) {
            setFullScreen(false) 
            setOptionsOpen(false)
          }
        }}
        style={{zIndex: 700, backgroundColor: "black", position: "absolute", top: 0, left: 0, width: "45px", height: "calc(100vh - 41px - 60px)", borderRight: "0.1px solid white", display: "flex", flexDirection: "column", alignItems: "center"}}>
        <FaBars className="hover-dim" title="Files" color="white" size={"21px"} style={{filter: buildModeStack? "brightness(0.7)" : "none", marginTop: "10px", cursor: "pointer"}} 
          onClick={async ()=>{
            setSelectedBuildComponent("")

            if (buildModeStack) {
              setSidebar(false)
              setBuildModeStack(false)
              setSelectedBuildComponent("")
              setOptionsOpen(false)
              setBuildingStack(false)
              try {
                await handleFileOpen(`${projectTitle}/src/App.js`)
                monacoAutoformat()
              } catch (error) {
                console.log(error)
              }
            } else {
              handleSidebar()
            }
          }}/>
        <FiEdit title="Build" color="white" size={"20px"} style={{filter: buildModeStack? "none" : "brightness(0.7)", marginTop: "14px", cursor: "pointer"}}
            className="prompt-button hover-dim"
            onClick={async () => { 
              if (buildModeStack) {
                if (buildModeStackRoute === "Page") {
                  handleSidebar()
                }
              } else {
                setBuildingStack(true)
                setSelectedBuildComponent("")
                setBuildModeStack(true)
                setOptionsOpen(false)
                setSidebar(true)
              }
            }}>
             <p style={{color: "black", fontWeight: "bold"}}>{buildingStack?  "Code Editor" : "Build Mode"}</p>
        </FiEdit> 
      </div>

      {/* Editor & Sidebar */}
      <div style={{width: "calc(50vw + 30px)", height: "calc(100% - 41px)", position: "absolute", display: "flex", flexDirection: "row"}}> 
          <div style={{width: sidebar? "180px" : "45px", height: "100%", backgroundColor: "black", borderRight: "0.1px solid white", display: "flex", flexDirection: "column", alignItems: "center"}}>
            {sidebar && <h1 className="select-none" style={{position: "absolute", top: "6px", left: "57px", color: "white", fontWeight: "500", fontSize: "23px"}}>Files</h1>}
            {sidebar && <div style={{position: "absolute", top: "38.8px", left: "45px", backgroundColor: "white", width: "150px", height: "0.5px"}}></div>}
            
            {sidebar && 
            <div style={{overflow: "scroll", position: "absolute", width: sidebar? "130px" : 0,  height: "calc(100% - 43px)", backgroundColor: "black", marginTop: "43px", cursor: "pointer", left: "49px"}}>
            <div className="file-tree" style={{ color: "white", padding: "0px 0px"}}>
              {Object.entries(tree).map(([nodeName, node]) =>
                renderTreeNode(node, nodeName)
              )}
            </div>
            </div>}
          </div>
    
         <div style={{height: "100%", width: sidebar? "calc(100% - 180px)" : "calc(100% - 45px)"}}>
            <div className="hide-scroll" style={{zIndex: 3,  height: "25px", width: "100%", borderBottom: "0.1px solid white", backgroundColor: "black", display: "flex", flexDirection: "row", overflow: "scroll"}}>
              
              {refreshCount > 0 && openFiles.map((item, index) => (
                 <div 
                  key={index}
                  className="file-item"
                  onClick={() => {
                    setOpenFileNum(index); 
                    let currentFile = openFiles[index] 
                    setFile(currentFile)}}
                  style={{opacity: openFileNum === index? 1 : 0.6, height: "100%", width: "100px", minWidth: "100px", backgroundColor: "transparent", borderRight: "0.1px solid white", display: "flex", alignItems: "center", userSelect: "none", cursor: "pointer"}}>
                  <div style={{overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", backgroundColor: "transparent", width: "calc(100% - 22px)", height: "auto"}}>
                    <p style={{color: "white", marginLeft: "10px", fontSize: "15px"}}>{item.name}</p>
                  </div>
                  <div className="file-x" style={{position: "absolute", marginLeft: "82px", width: "15px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "transparent", opacity: 0.35}}>
                    <IoClose color="white" size={"19px"} onClick={()=>{closeFile(index)}}/>
                  </div>
               </div>
              ))}

            </div>
            <div onClick={()=>{setDotsOpen(false); setOptionsOpen(false)}} style={{height: "calc(100% - 25px)", paddingTop: "6px", backgroundColor: "black"}}>
              <Editor
                id="editor"
                ref={editorRef}
                onChange={()=>{
                  let fileOpened = openFileNum; 
                  handleEditorChange(fileOpened)
                }}
                height="100%"
                defaultLanguage = {openFileNum === null ?  "javascript" : file.language}
                value = {openFileNum === null ?  "" : file.value}
                path = {openFileNum === null ?  "/" : file.name}
                theme="hc-black"
                // theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                  autoIndent: 11,
                  fontSize: 13.5, 
                  letterSpacing: 0.9,
                  inlineSuggest: 61,
                  lineNumbers: "on", 
                  lineNumbersMinChars: 3, 
                  wordWrap: "off",  
                  fontVariations: 53,
                  scrollBeyondLastLine: false,  
                  fontFamily: 48,
                  scrollbar: {
                    vertical: "hidden",
                    horizontal: "hidden",
                  },
                }}
                />
              </div>
          </div>
      </div>

      {/* Bottom Bar */}
      <div style={{zIndex: 2, backgroundColor: "black", borderTop: "0.1px solid white", position: "absolute", bottom: 0, left: 0, paddingLeft: "14px", height: "40px", width: "100vw", display: "flex", flexDirection: "row", borderTop: "0.1px solid black", gap: "6px", alignItems: "center"}}>
          <div style={{fontSize:"19px", height: "100%", display: "flex", alignItems: "center"}}>
          <CgPlayListAdd 
            title="New Project" 
            className="hover-dim question" 
            onClick={()=>{ 
              setOptionsOpen(!optionsOpen);
             }}
            color="white"
            size={"25px"}
            style={{cursor: "pointer", filter: "brightness(0.9)", marginTop: "-1px", marginRight: "10px"}}/>
        
            
            {!fullScreen? 
            <BsWindow 
              title="Full Screen"
              color="white" 
              size={"19px"}
              className="hover-dim"
              onClick={() => { 
                setFullScreen(true) 
                setOptionsOpen(false)
              }}
              style={{cursor: "pointer", marginTop: "-2px", marginRight: "-3px"}}/> 
            : 
            <BsWindowSplit 
              color="white" 
              title="Half Screen"
              className="hover-dim"
              size={"19px"} 
              onClick={() => { 
                setFullScreen(false) 
                setOptionsOpen(false)
              }}
              style={{cursor: "pointer", marginTop: "-2px", marginRight: "-3px"}}/>
          }
            
          </div>
          
          {selectedBuildComponent !== "" && <> <div className="hover-dim" onClick={()=>{
            setAIMode(AIMode === "ADD"? "ALTER" : "ADD")
          }} style={{color: "white", cursor: "pointer", marginLeft: "12px", fontWeight: "500", filter: "brightness(85%)", border: "0.5px solid #999", borderRadius: "6px", padding: "3.8px 8px", display: "flex", flexDirection: "row", gap: "4px"}}>
            <p>{AIMode}</p> 
          </div>

          <input   
            id="userPrompt"
            type="text" 
            placeholder='Enter a prompt...'
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                moneyyy(event);
              }
            }}
            style={{ width: "calc(100% - 200px)", border: "none", outline: "none", fontSize: "17px", backgroundColor: "black", color: "white", marginLeft: "6px" }}
          /> 

          {!isSubmitting && <div style={{fontSize: "27px", height: "100%", width: "auto", display: "flex", alignItems: "center"}}>
            <BsArrowRightCircle ref={formRef} 
              title="Generate" color="white" size={"27px"}
              onClick={handleSubmit}
              className="hover-dim"
              style={{marginLeft: "10px", cursor: "pointer", marginRight: "6px"}}
            /> 
          </div>}
          
          </>}

          <div id="lottie-container-1" style={{display: isSubmitting? "block" : "none", pointerEvents: "none", backgroundColor: "transparent", height: "100px", minWidth: "100px", width: "100px", padding: 0, margin: 0, marginRight: "-25px"}}></div>
          
          <div style={{marginLeft: selectedBuildComponent !== ""? 0 : "calc(100vw - 131px)", fontSize: "27px", height: "100%", width: "auto", display: "flex", alignItems: "center"}}>
            <SiReact 
              title="Display" color="white" size={"27px"}
              style={{cursor: "pointer"}}
              className="hover-dim"
              onClick={handleBuild}
            /> 
          </div>
          <div style={{fontSize: "19px", height: "100%", width: "auto", display: "flex", alignItems: "center"}}>
            <BsThreeDotsVertical title="Options" 
              className="hover-dim" color="white" 
              style={{marginRight: "8px", cursor: "pointer"}}
              onClick={() => {setDotsOpen(!dotsOpen)}}
            />
          </div>

      </div>

      {/* Display */}
      <div 
        style={{zIndex: 10, position: "absolute", width: fullScreen? "calc(100vw - 45px)" : "50vw", marginLeft: fullScreen? "45px" : "50vw", height: "calc(100vh - 41px - 60px)", borderLeft: "0.1px solid white"}} >
        {/* {hasRunOnce && !buildModeStack &&
          <div style={{width: "100%", backgroundColor: "black", height: "25px", display: "flex", flexDirection: "row"}}>
          <div title="Revert" style={{width: "25px", borderRight: "1px solid white", color: "white", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center"}} 
            className="prompt-button hover-dim"
            onClick={()=>{handleFrameChange(0)}}>
            <IoChevronBack color="white" size={"25px"}/>
          </div>
          <div style={{width: "calc(100% - 25px)", height: "100%", display: "flex", flexDirection: "row", backgroundColor: "black"}}>
            {numberOfRenders !== 1 && <div style={{userSelect: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: renderButtonWidths, height: "100%", filter: currentFrame === 1? "brightness(80%)" : "brightness(45%)", borderRight: "1px solid white", color: "white", fontSize: "19px"}} 
              className={` ${currentFrame === 1 ? "prompt-button" : "prompt-button hover-dim"}`}
              onClick={()=>{handleFrameChange(1)}}> 
              1
            </div>}
            {numberOfRenders >= 2 && <div style={{userSelect: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: renderButtonWidths, height: "100%", filter: currentFrame === 2? "brightness(80%)" : "brightness(45%)", borderRight: "1px solid white", color: "white", fontSize: "19px"}} 
              className={` ${currentFrame === 2 ? "prompt-button" : "prompt-button hover-dim"}`}
              onClick={()=>{handleFrameChange(2)}}>
              2
            </div>}
            {numberOfRenders >= 3 && <div style={{userSelect: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: renderButtonWidths, height: "100%", filter: currentFrame === 3? "brightness(80%)" : "brightness(45%)", borderRight: "1px solid white", color: "white", fontSize: "19px"}} 
              className={` ${currentFrame === 3 ? "prompt-button" : "prompt-button hover-dim"}`}
              onClick={()=>{handleFrameChange(3)}}>
              3
            </div> }
            {numberOfRenders >= 4 && <div style={{userSelect: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: renderButtonWidths, height: "100%", filter: currentFrame === 4? "brightness(80%)" : "brightness(45%)", color: "white", fontSize: "19px"}} 
              className={` ${currentFrame === 4 ? "prompt-button" : "prompt-button hover-dim"}`}
              onClick={()=>{handleFrameChange(4)}}>
              4
            </div> }
          </div>
        </div>} */}
        
        <div style={{display: draggable? "block" : "none", width: "calc(100% - 3px)", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 900}}>
          {draggable && <Canvas/>}
          <div style={{zIndex: 200, position: "absolute", top: 0, left: 0, marginTop: yVal, marginLeft: xVal, width: `${width}px`, height: `${height}px`, backgroundColor: "red"}}></div>
        </div>
    
        <div ref={frameRef} style={{width: draggable ? "calc(100% - 3px)" : "100%", height: "100%", backgroundColor: displayColor}}>
        </div>

      </div>

      {/* Build Mode Alert */}
      {buildMode && canShowBuildMode && <div style={{position: "absolute", height: "100%", width: "50vw", zIndex: 900}}>
        <div style={{position: "absolute", height: "100%", width: "100%", backgroundColor: "black", opacity: 0.4}}></div>
          <div style={{position: "absolute", height: "100%", width: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
              <div style={{position: "relative", marginTop: "-15vh", height: "260px", width: "400px", maxWidth: "80%", borderRadius: "15px", backgroundColor: "black", border: "1px solid white", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "10px"}}>
                <div className="hover-dim" style={{filter: "brightness(0.5)", position: "absolute", top: "10px", right: "10px", cursor: "pointer"}} 
                  onClick={()=>{setBuildMode(false); setBuildingStack(false); setDisplayColor("white")}} ><IoClose color="white" size={35}/></div>
                <div style={{width: "80%", color: "white", fontSize: "30px", fontWeight: "bold", textAlign: "center"}}>
                  {BuildAlert1Text}
                </div>
                <div 
                  className="hover-dim" 
                  onClick={async ()=>{
                    setBuildMode(false); 
                    setBuildModeStack(true); 
                    setSidebar(true)
                    setCurrentStack([[]])
                    setDisplayColor("white")

                    setBuildModeStackRoute("Page")
                    setCurrentPage(0)
                    
                    // Open Blank Slate
                    editorRef.current.setValue(emptyAppJS);
                    await handleBuild()

                    // Set new images (assuming component will have images)
                    if (currentSRCArray.length === 0) {
                      let imagesToAdd = []
                      for (let k=0;k<20;k++) {
                        let result = await getUnsplashRandomImageUrl("500x300/","");
                        if (result !== null) {imagesToAdd.push(result)}
                      }
                      setCurrentSRCArray(imagesToAdd)
                    }

                  }} style={{cursor: "pointer", maxWidth: "190px", width: "80%", backgroundColor: "white", fontSize: "20px", fontWeight: "bold", padding: "9px 25px", whiteSpace: "nowrap", border: "1px solid white", borderRadius: "16px", fontWeight: "100", textAlign: "center"}}>
                  <p style={{color: "black", fontWeight: "bold"}}>{BuildButton1Text}</p>
                </div>
               
                {/* {displayWarningProgress && <div style={{width: "76%", margin: "3px 0"}} className="progress-bar">
                  <div className="progress" style={{ width: `${storingProgress}%` }}>
                  </div>
                </div>}
                <div style={{width: "80%", color: "white", fontSize: "20px", fontWeight: "100", textAlign: "center"}}>
                  {warningText3}
                </div> */}
              </div>

        </div>
      </div>}

      {/* Build Mode */}
      {buildModeStack && !fullScreen && 
      <div style={{position: "absolute", height: "calc(100% - 40px)", width: "calc(50vw + 0.1px)", zIndex: 600}}>
        <div className="select-none" style={{zIndex: 600, width: "100%", height: "100%", borderBottom: "0.1px solid white", borderRight: "2px solid black", position: "absolute", display: "flex", flexDirection: "row"}}> 
          <div className="select-none" style={{userSelect: "none", zIndex: 600, marginLeft: "45px", width: sidebar? "135px" : "0px", height: "100%", backgroundColor: "black", borderRight: "0.1px solid white", display: "flex", flexDirection: "column", alignItems: "center"}}>
            
            {/* Pages  */}
            {sidebar && buildModeStackRoute === "Pages" && <h1 className="select-none" style={{position: "absolute", top: "6px", left: "57px", color: "white", fontWeight: "500", fontSize: "23px"}}>Pages</h1>}
            {sidebar && buildModeStackRoute === "Pages" && <div style={{position: "absolute", top: "38.8px", left: "45px", backgroundColor: "white", width: "135px", height: "0.5px"}}></div>}
            {sidebar && buildModeStackRoute === "Pages" && <div className="select-none" style={{paddingRight: "10px", overflow: "scroll", position: "absolute", width: sidebar? "130px" : 0, height: "calc(100% - 40px)", backgroundColor: "transparent", marginTop: "39px"}}>
              <div>
                  {pageNames.length === 0? 
                  <div 
                    onClick={()=>{addPage()}} 
                    className="hover-dim" style={{marginTop: "9px", marginLeft: "10px",cursor: "pointer", width: "calc(100% - 10px)", height: "33px", backgroundColor: "black", border: "1px solid white", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                    <HiPlusSm style={{marginLeft: "-10px", marginTop: "-2px"}} color="white" fontSize={28} />
                    <p style={{marginLeft: "-3px", color: "white", fontWeight: "bold", fontFamily: "unset"}}>
                      Page
                    </p>
                  </div>
                  : 
                  <>
                    <div className="select-none" > 
                      <div className="select-none" style={{userSelect: "none", paddingBottom: "50px", marginTop: "13px"}}>
                        {updateStackNum > 0 && <PagesDraggableList>
                        </PagesDraggableList>}
                        
                        <div 
                          onClick={()=>{addPage()}} 
                          className="hover-dim" style={{marginTop: "9px", marginLeft: "10px",cursor: "pointer", width: "calc(100% - 10px)", height: "33px", backgroundColor: "black", border: "1px solid white", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                          <HiPlusSm style={{marginLeft: "-10px", marginTop: "-2px"}} color="white" fontSize={28} />
                          <p style={{marginLeft: "-3px", color: "white", fontWeight: "bold", fontFamily: "unset"}}>
                            Page
                          </p>
                        </div>

                      </div>
                    
                    </div>
                  </>
                }
              </div>
            </div>}

            {/* Page  */}
            {sidebar && buildModeStackRoute === "Page" && 
            <>
              <BsChevronLeft 
                onClick={()=>{
                  setBuildModeStackRoute("Pages")
                  setSelectedBuildComponent("")
                  const iframe = frameRef.current.querySelector('iframe');
                  if (iframe && iframe.contentWindow.location) {
                    const currentNavigation = iframe.contentWindow.location.href;
                    const segments = currentNavigation.split('/');
                    const lastWord = segments[segments.length - 1];
                    if (lastWord !== "") {redirect("")}
                  } 
                  
                }} style={{cursor: "pointer", marginTop: "8.8px", marginLeft: "-100px"}} size={21} color="white"/>
              <h1 className="select-none" style={{marginLeft: "20px", position: "absolute", top: "6px", left: "57px", color: "white", fontWeight: "500", fontSize: "23px"}}>{pageNames[currentPage]}</h1>
              <div style={{position: "absolute", top: "38.8px", left: "45px", backgroundColor: "white", width: "135px", height: "0.5px"}}></div>
              
              <div className="select-none" style={{paddingRight: "10px", overflow: "scroll", position: "absolute", width: sidebar? "130px" : 0, height: "calc(100% - 40px)", backgroundColor: "transparent", marginTop: "39px"}}>
                <div>
                    {currentStack[currentPage] && currentStack[currentPage].length === 0? 
                    <div className="hover-dim" onClick={()=>{setSidebar(false)}} style={{marginTop: "10px", marginLeft: "10px", cursor: "pointer", width: "calc(100% - 10px)", height: "33px", backgroundColor: "black", border: "1px solid white", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                      <HiPlusSm style={{marginLeft: "-10px", marginTop: "-3px"}} color="white" fontSize={26} />
                      <p style={{marginLeft: "-3px", marginTop: "-2px", color: "white", fontWeight: "bold", fontFamily: "unset", fontSize: "14px"}}>
                        Component
                      </p>
                    </div>
                    : 
                    <div className="select-none" > 
                      <div className="select-none" style={{userSelect: "none", paddingBottom: "50px", marginTop: "13px"}}>
                        {updateStackNum > 0 && 
                          <>
                            <DraggableList/>
                            <div className="hover-dim" onClick={()=>{handleSidebar()}} style={{marginTop: "10px", marginLeft: "10px", cursor: "pointer", width: "calc(100% - 10px)", height: "33px", backgroundColor: "black", border: "1px solid white", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                              <HiPlusSm style={{marginLeft: "-10px", marginTop: "-3px"}} color="white" fontSize={26} />
                              <p style={{marginLeft: "-3px", marginTop: "-2px", color: "white", fontWeight: "bold", fontFamily: "unset", fontSize: "14px"}}>
                                Component
                              </p>
                            </div>
                          </>
                        }
                      </div>
                    
                    </div>
                  }
                </div>
              </div>
            </>}

            {/* Component  */}
            {sidebar && buildModeStackRoute === "Component" && 
            <>
              <BsChevronLeft
                onClick={()=>{
                  setBuildModeStackRoute("Page")
                  setSelectedBuildComponent("")
                  setCurrentComponentIndex(0)
                  setCurrentElementPath("")

                  setOptionsSelector("")
                  setCurrentCSSFile("")
                  setCurrentCSSFileObject({})
                  setCurrentCSSClassesObject({})
                  setCurrentCSSIDsObject({})
                  
                }} style={{cursor: "pointer", marginTop: "8.8px", marginLeft: "-100px"}} size={21} color="white"/>
              <h1 className="select-none" style={{marginLeft: "20px", position: "absolute", top: "6px", left: "57px", color: "white", fontWeight: "500", fontSize: "23px"}}>{currentStack[currentPage][currentComponentIndex]}</h1>
              <div style={{position: "absolute", top: "38.8px", left: "45px", backgroundColor: "white", width: "135px", height: "0.5px"}}></div>
              

              <div style={{overflow: "scroll", position: "absolute", width: sidebar? "130px" : 0,  height: "calc(100% - 43px)", backgroundColor: "black", marginTop: "43px", cursor: "pointer", left: "49px"}}>
                {count1 > 0 && <div className="file-tree" style={{ color: "white", padding: "0px 0px"}}>
                  {Object.entries(elementTree).map(([nodeName, node]) =>
                    renderElementTreeNode(node, nodeName)
                  )}
                </div>}
              </div>
            
            </>}

          </div>    

          {/* Right Side  */}
          <div style={{height: "100%", width: sidebar? "calc(100% - 180px)" : "calc(100% - 45px)", backgroundColor: "black"}} onClick={()=>{setDotsOpen(false); setOptionsOpen(false)}} >
          {/* Browse Components  */}
          {buildModeStackRoute === "Page" && <div style={{maxHeight: "100%", overflow: "scroll", borderBottom: "1px solid white"}}>
              <h2 style={{zIndex: 990, color: "white", padding: "5px 10px", position: "fixed", backgroundColor: "black", width: sidebar? "calc(50% - 180px)" : "calc(50% - 45px)", borderBottom: "1px solid white"}} onClick={()=>{setDraggable(!draggable)}}>Components</h2>
              <div style={{marginTop: "39px"}}>{componentData.length > 0 && componentData.map((componentFile, index) => (
                <>
                  {/* <h3 style={{color: "white", marginLeft: "10px"}}>{componentFile[index]}</h3> */}
                  <div style={{zIndex: 3,  height: "120px", width: "100%", borderTop: "0.1px solid white", borderBottom: "0.1px solid white", backgroundColor: "black", display: "flex", flexDirection: "row", overflow: "scroll"}}>
                    {componentData[componentData.length - 1 - index][1] && componentData[componentData.length - 1 - index][1].map((item, index2) => (
                      <div 
                        key={index2}
                        className="hover-dim hide-scroll"
                        onClick={async ()=>{
                          if (canSelect) {
                            let found = false
                            for (let i=0;i<openFiles.length;i++) {
                              if (openFiles[i].path === path) {
                                // File is already open
                                found = true
                                setOpenFileNum(i)
                                setFile( openFiles[i] )
                              }
                            }

                            if (!found) {
                              // Open up App.js if it exists
                              let appjs = null;
                              try {appjs = await retrieveFileByPath(`${projectTitle}/src/App.js`)
                              } catch {appjs = null}
                              if (appjs !== null) {
                                await handleFileOpen(`${projectTitle}/src/App.js`)
                              }
                            }
                            canSelect = false
                            setUpdateStackNum(updateStackNum + 1)
                            let component = item.component
                            addComponent(component)
                            setSidebar(true)
                            canSelect = true
                          }
                        }}
                        style={{padding: "20px", height: "100%", width: "150px", minWidth: "150px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "3px", backgroundColor: "transparent", borderRight: "0.1px solid white", cursor: "pointer"}}>
                        <p style={{fontWeight: "bold", userSelect: "none", color: "white", fontSize: "15px", fontFamily: "unset", whiteSpace: "nowrap", textOverflow: "ellipsis"}}>{separateNums(item.component)}</p>
                        <img style={{width: "100%", maxHeight: "80px", objectFit: "cover", borderRadius: "5px", border: "1px solid white"}} src={gitIMGs[index][index2]? gitIMGs[index][index2].img : gitIMGs[2][3].img} alt=""/>
                    </div>
                    ))}
                  </div>
                </>
              ))}
              </div>
          </div>}
          
          {/* Alter Component  */}
          {currentElementPath !== "" && <>
              {/* Image Selector Absolute */}
              {optionsSelector === "image" && <div style={{position: "absolute", top: "115px", left: "180px", width: "calc(100% - 180px)", height: "calc(100% - 115px)", zIndex: 100, backgroundColor: "black"}}>
                  <div style={{ borderTop: "1px solid white", width: "100%", height: "40px", display: "flex", flexDirection: "row", alignItems: "center"}}>
                      <div style={{height: "40px", width: "calc(100%)", display: "flex", alignItems: "center"}}>
                  
                        {/* IMG SEARCHING  */}
                          <input
                          type="text"
                          placeholder="Search Images..."
                          value={currentIMGSearchTerm}
                          onChange={(event) => {
                            setCurrentIMGSearchTerm(event.target.value);
                          }}
                          onKeyPress={async (e) => {
                            if (e.key === "Enter") {
                                await refreshIMGArray();
                            }
                          }}
                          style={{
                            padding: "5px",
                            paddingLeft: "7px",
                            fontSize: "15px",
                            marginLeft: "16.5px",
                            border: "none",
                            backgroundColor: "white",
                            borderRadius: "5px",
                            width: "calc(100% - 33px - 15px)",
                            minWidth: "calc(100% - 33px - 15px)",
                            height: "24px"
                          }}
                          />

                          {!buildingSRCArray && <BsArrowRightCircle 
                            className="hover-dim" 
                            color="white" 
                            size={20}
                            onClick={async ()=>{
                              await refreshIMGArray();
                            }}
                            style={{position: "absolute", marginTop: "1px", right: "6px", marginLeft: "5px", cursor: "pointer"}}
                          />}

                          <div id="lottie-container-2" style={{display: buildingSRCArray? "block" : "none", pointerEvents: "none", height: "85px", minWidth: "85px", width: "85px", zIndex: 999, marginLeft: "-25px"}}></div>
                          


                      </div>
                  </div>
                  
                  <div style={{overflow: "scroll", height: "calc(100% - 40px + 0.5px)", width: "100%", borderBottom: "1px solid white"}}>
                    
                    {currentSRCArray.map((src, index) => {
                      return (
                        <img 
                        alt=""
                        onClick={async()=>{
                          setBackupText(imgSRCValue)
                          setClickedTrash(true)
                          setImgSRCValue(currentSRCArray[index]); 
                          await saveEdits(currentSRCArray[index])
                          console.log(currentSRCArray)
                        }}
                        className="hover-dim"
                        style={{cursor: "pointer", width: "100%", height: "auto"}}
                        src={currentSRCArray[index]} />
                      )
                    })}
                
                  </div>

              </div>}

              {/* Styles Selector Absolute  */}
              {optionsSelector === "tag" && <div 
                style={{overflow: "scroll", fontFamily: "unset" , padding: "10px 15px", position: "absolute", top: showAddTextInput? "80px" : "50px", left: "180px", width: "calc(100% - 180px)", height: showAddTextInput? "calc(100% - 80px" : "calc(100% - 50px)", zIndex: 100, backgroundColor: "black", borderTop: "1px solid white"}}>
                {removeAsterisks(currentElementPath.split("/").pop()) !== "Link" && <div style={{color: "white", fontWeight: "600", fontSize: "26px"}}>Styles</div>}

                {/* Link Tag */}
                {removeAsterisks(currentElementPath.split("/").pop()) === "Link" && 
                <div style={{marginTop: "2px", display: "flex", flexDirection: "row"}}>
                  <div style={{color: "white", fontSize: "22px", fontWeight: "bold"}}>Link To Page</div>
                  
                  <div style={{marginLeft: "8px", marginTop: "4px"}}>
                    <select id="dropdown" value={currentLink} onChange={handleDropdownChange}>
                      {pageNames.map((option, index) => (
                        <option key={index} value={option.toLowerCase()}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>}

                {/* <a> Tags */}
                {showaTagInput && <div style={{marginTop: "7px", display: "flex", flexDirection: "row"}}>
                <div style={{color: "white", fontSize: "17px"}}>URL</div>
                <input
                type="text"
                value={aTagInputValue}
                onChange={(event) => {
                  setaTagInputValue(event.target.value);
                  if (clickedaTagTrash) {setClickedaTagTrash(false)}
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    saveEdits("");
                  }
                }}
                style={{
                  padding: "5px",
                  paddingLeft: "7px",
                  fontSize: "15px",
                  marginLeft: "8px",
                  border: "none",
                  backgroundColor: "white",
                  borderRadius: "5px",
                  width: "calc(100% - 33px - 18px)",
                  height: "24px"
                }}
                />

                {!clickedaTagTrash && <BsTrash3Fill 
                  className="hover-dim" 
                  color="white" 
                  onClick={()=>{
                    setBackupaTagText(aTagInputValue)
                    setaTagInputValue("")
                    setClickedaTagTrash(true)
                  }}
                  style={{filter: "brightness(0.85)", position: "absolute", marginTop: "2.5px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}

                {clickedaTagTrash && <FaUndoAlt
                  className="hover-dim" 
                  color="white" 
                  onClick={()=>{
                    setaTagInputValue(backupaTagText)
                    setClickedaTagTrash(false)
                  }}
                  style={{position: "absolute", marginTop: "1px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}

                </div>}

                {/* Ids */}
                <div style={{marginTop: "4px"}}>
                  {Object.keys(currentCSSIDsObject).length > 0 && Object.keys(currentCSSIDsObject).map((item, index) => {
                    let values = currentCSSIDsObject[item]
                    return (<div key={index} style={{color: "white"}}>
                      <div style={{display: "flex", flexDirection: "row"}}>
                        <div style={{filter: "brightness(0.5)", color: "white", marginTop: "5px"}}>
                          {removeComments(item)}
                        </div>
                        <IoAddCircleOutline 
                          id="cssArrow"
                          color="white" 
                          onClick={()=>{
                            setShowPopup(true); 
                            setShowAddCSSAttribute1(true)
                            setCurrentCSSItemIndex(index)

                            setShowAddCSSAttribute2(false)
                            setAttribute1("")
                            setAttribute2("")
                            setFilteredList([])
                            setCSSInputValue("")

                            setCSSEditingType("id")
                            
                            setTimeout(() => {
                              if (id_cssInputRef.current) {
                                id_cssInputRef.current.focus();
                              }
                            }, 20);
                          }}
                          size={21} 
                          className="hover-dim"
                          style={{filter: "brightness(0.78)", marginTop: "4px", marginLeft: "4.5px"}}
                        />
                      </div>
                      <div style={{marginBottom: "15px"}}>{values.length > 0 && values.map((item2, index2) => {
                        let stringWidth = getStringWidth(removeComments(values[index2].split(":")[0]), "17px", "unset")
                        return (
                          <div style={{display: "flex", flexDirection: "row", marginTop: "9px"}}>
                            <div style={{marginRight: "8px"}}>{removeComments(values[index2].split(":")[0])}</div>
                            {count1 > 0 && <input 
                              type="text"
                              value={currentCSSIDsObject[item][index2].split(":").slice(1).join(":")}
                              onChange={(event)=>{
                                let currentCSSIDsObjectCopy = currentCSSIDsObject
                                currentCSSIDsObjectCopy[item][index2] = currentCSSIDsObject[item][index2].split(":")[0] + ":" + event.target.value
                                setCurrentCSSIDsObject(currentCSSIDsObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{position: "absolute", right: "30px", width: `calc(100% - 46px - ${stringWidth}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                            />}
                            <BsTrash3Fill 
                              className="hover-dim" 
                              color="white" 
                              size={16}
                              onClick={()=>{
                                let currentCSSIDsObjectCopy = currentCSSIDsObject
                                let array = currentCSSIDsObject[item]
                                let newArray = []
                                for (let i=0;i<array.length;i++) {
                                  if (array[i] !== currentCSSIDsObject[item][index2]) {
                                    newArray.push(array[i])
                                  }
                                }
                                currentCSSIDsObjectCopy[item] = newArray
                                setCurrentCSSIDsObject(currentCSSIDsObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                            />
                          </div>
                        )
                      })}
                      </div>
                      
                      {/* <CSSOutsideClickDetector onOutsideClick={() => {
                        console.log("outside")
                        handleCSSOutsideClick()
                        }}> */}
                      {showPopup && showAddCSSAttribute1 && currentCSSItemIndex === index && cssEditingType === "id" &&
                      <div id="cssArrowParent" style={{color: "white", width: "100%", marginTop: "-5px"}}>
                        <input 
                          ref={id_cssInputRef}
                          type="text"
                          value={cssInputValue}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (validCSSAttributes.includes(cssInputValue)) {
                                setFilteredList([])
                                setShowCSSAttributeList(false)
                                setShowAddCSSAttribute1(false)
                                setShowAddCSSAttribute2(true)
                                setAttribute1(cssInputValue)

                                setTimeout(() => {
                                  if (id_attribute2InputRef.current) {
                                    id_attribute2InputRef.current.focus();
                                  }
                                }, 20);
                              }
                            }
                          }} 
                          onChange={(e)=>{
                            setCSSInputValue(e.target.value.toLowerCase())
                            setFilteredList(
                              validCSSAttributes.filter(item1 => item1.startsWith(e.target.value.toLowerCase()))
                            )
                            if (e.target.value.length === 0) {
                              setShowCSSAttributeList(false)
                            } else if (!showCSSAttributeList) {
                              setShowCSSAttributeList(true)
                            }
                          }}
                          style={{fontSize: "17px", width: "calc(100% - 22px)", height: "21px", backgroundColor: "transparent", color: "white", border: "none", outline: "none"}}
                        />
                        <div style={{height: "0.3px", marginTop: "4px", width: "100%", backgroundColor: "white"}}></div>
                        <BsArrowRightCircleFill color="white" size={17} 
                        className="hover-dim"
                        onClick={()=>{
                          if (validCSSAttributes.includes(cssInputValue)) {
                            setFilteredList([])
                            setShowCSSAttributeList(false)
                            setShowAddCSSAttribute1(false)
                            setShowAddCSSAttribute2(true)
                            setAttribute1(cssInputValue)

                            setTimeout(() => {
                              if (id_attribute2InputRef.current) {
                                id_attribute2InputRef.current.focus();
                              }
                            }, 20);
                          }
                        }}
                        style={{filter: "brightness(0.85)", position: "absolute", right: "15px", marginTop: "-22px"}}/>
                        
                        {/* DropDown */}
                        {showCSSAttributeList && <div style={{display: filteredList.length > 0 ? "block" : "none", zIndex: 800, marginLeft: "4px", maxWidth: "195px", height: `calc(26px * ${filteredList.length})`, overflow: "scroll", position: "absolute", width: "calc(100% - 30px)", backgroundColor: "black", maxHeight: "120px", borderBottomRightRadius: "10px", borderBottomLeftRadius: "10px", border: "0.3px solid white", borderTop: "none", paddingBottom: "5px"}}>
                          <>
                          {validCSSAttributes.filter(item1 => item1.startsWith(cssInputValue.toLowerCase())).map((item, index) => (
                            <div 
                            key={index} 
                            className="hover-dim" 
                            onClick={()=>{
                              setFilteredList([])
                              setShowCSSAttributeList(false)
                              setShowAddCSSAttribute1(false)
                              setShowAddCSSAttribute2(true)
                              setAttribute1(item)

                              setTimeout(() => {
                                if (id_attribute2InputRef.current) {
                                  id_attribute2InputRef.current.focus();
                                }
                              }, 20);
                            }}
                            style={{ height: '23px', width: '100%', padding: '5px 10px' }}>
                              {item}
                            </div>
                          ))}
                          </>
                        </div>}
                      </div>}

                      {showAddCSSAttribute2 && currentCSSItemIndex === index && cssEditingType === "id" && 
                      <div style={{marginBottom: "8px", display: "flex", flexDirection: "row", marginTop: "-5px"}}>
                        <div style={{marginRight: "8px"}}>{attribute1}</div>
                        {count1 > 0 && <input 
                          type="text"
                          ref={id_attribute2InputRef}
                          onKeyPress={async (e) => {
                            if (e.key === "Enter") {
                              await addCSSComplete(item, false)
                            }
                          }} 
                          id="attribute2Input"
                          value={attribute2}
                          onChange={(event)=>{if (!event.target.value.includes(";") && !event.target.value.includes("{") && !event.target.value.includes("}")) {setAttribute2(event.target.value.toLowerCase())}}}
                          style={{position: "absolute", right: "30px", width: `calc(100% - 56px - ${getStringWidth(attribute1)}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", paddingRight: "24px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                        />}
                        <BsTrash3Fill 
                          className="hover-dim" 
                          color="white" 
                          size={16}
                          onClick={()=>{
                            resetCSSPopup()
                          }}
                          style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                        />
                        <BsArrowRightCircleFill color="black" size={17} 
                        className="hover-dim"
                        onClick={async ()=>{
                          await addCSSComplete(item, false)
                        }}
                        style={{position: "absolute", right: "35px", marginTop: "2px", marginLeft: "1px"}}/>
                        
                      </div>}

                      {/* </CSSOutsideClickDetector> */}

                    </div>)
                    })
                  }
                </div>


                {/* Classes */}
                <div style={{marginTop: "4px"}}>
                  {Object.keys(currentCSSClassesObject).length > 0 && Object.keys(currentCSSClassesObject).map((item, index) => {
                    let values = currentCSSClassesObject[item]
                    return (<div key={index} style={{color: "white"}}>
                      <div style={{display: "flex", flexDirection: "row"}}>
                        <div style={{filter: "brightness(0.5)", color: "white", marginTop: "5px"}}>
                          {removeComments(item)}
                        </div>
                        <IoAddCircleOutline 
                          id="cssArrow"
                          color="white" 
                          onClick={()=>{
                            setShowPopup(true); 
                            setShowAddCSSAttribute1(true)
                            setCurrentCSSItemIndex(index)

                            setShowAddCSSAttribute2(false)
                            setAttribute1("")
                            setAttribute2("")
                            setFilteredList([])
                            setCSSInputValue("")

                            setCSSEditingType("class")
                            
                            setTimeout(() => {
                              if (cssInputRef.current) {
                                cssInputRef.current.focus();
                              }
                            }, 20);
                          }}
                          size={21} 
                          className="hover-dim"
                          style={{filter: "brightness(0.78)", marginTop: "4px", marginLeft: "4.5px"}}
                        />
                      </div>
                      <div style={{marginBottom: "15px"}}>{values.length > 0 && values.map((item2, index2) => {
                        let stringWidth = getStringWidth(removeComments(values[index2].split(":")[0]), "17px", "unset")
                        return (
                          <div style={{display: "flex", flexDirection: "row", marginTop: "9px"}}>
                            <div style={{marginRight: "8px"}}>{removeComments(values[index2].split(":")[0])}</div>
                            {count1 > 0 && <input 
                              type="text"
                              value={currentCSSClassesObject[item][index2].split(":").slice(1).join(":")}
                              onChange={(event)=>{
                                let currentCSSClassesObjectCopy = currentCSSClassesObject
                                currentCSSClassesObjectCopy[item][index2] = currentCSSClassesObject[item][index2].split(":")[0] + ":" + event.target.value
                                setCurrentCSSClassesObject(currentCSSClassesObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{position: "absolute", right: "30px", width: `calc(100% - 46px - ${stringWidth}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                            />}
                            <BsTrash3Fill 
                              className="hover-dim" 
                              color="white" 
                              size={16}
                              onClick={()=>{
                                let currentCSSClassesObjectCopy = currentCSSClassesObject
                                let array = currentCSSClassesObject[item]
                                let newArray = []
                                for (let i=0;i<array.length;i++) {
                                  if (array[i] !== currentCSSClassesObject[item][index2]) {
                                    newArray.push(array[i])
                                  }
                                }
                                currentCSSClassesObjectCopy[item] = newArray
                                setCurrentCSSClassesObject(currentCSSClassesObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                            />
                          </div>
                        )
                      })}
                      </div>
                      
                      {/* <CSSOutsideClickDetector onOutsideClick={() => {
                        console.log("outside")
                        handleCSSOutsideClick()
                        }}> */}
                      {showPopup && showAddCSSAttribute1 && currentCSSItemIndex === index && cssEditingType === "class" &&
                      <div id="cssArrowParent" style={{color: "white", width: "100%", marginTop: "-5px"}}>
                        <input 
                          ref={cssInputRef}
                          type="text"
                          value={cssInputValue}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (validCSSAttributes.includes(cssInputValue)) {
                                setFilteredList([])
                                setShowCSSAttributeList(false)
                                setShowAddCSSAttribute1(false)
                                setShowAddCSSAttribute2(true)
                                setAttribute1(cssInputValue)

                                setTimeout(() => {
                                  if (attribute2InputRef.current) {
                                    attribute2InputRef.current.focus();
                                  }
                                }, 20);
                              }
                            }
                          }} 
                          onChange={(e)=>{
                            setCSSInputValue(e.target.value.toLowerCase())
                            setFilteredList(
                              validCSSAttributes.filter(item1 => item1.startsWith(e.target.value.toLowerCase()))
                            )
                            if (e.target.value.length === 0) {
                              setShowCSSAttributeList(false)
                            } else if (!showCSSAttributeList) {
                              setShowCSSAttributeList(true)
                            }
                          }}
                          style={{fontSize: "17px", width: "calc(100% - 22px)", height: "21px", backgroundColor: "transparent", color: "white", border: "none", outline: "none"}}
                        />
                        <div style={{height: "0.3px", marginTop: "4px", width: "100%", backgroundColor: "white"}}></div>
                        <BsArrowRightCircleFill color="white" size={17} 
                        className="hover-dim"
                        onClick={()=>{
                          if (validCSSAttributes.includes(cssInputValue)) {
                            setFilteredList([])
                            setShowCSSAttributeList(false)
                            setShowAddCSSAttribute1(false)
                            setShowAddCSSAttribute2(true)
                            setAttribute1(cssInputValue)

                            setTimeout(() => {
                              if (attribute2InputRef.current) {
                                attribute2InputRef.current.focus();
                              }
                            }, 20);
                          }
                        }}
                        style={{filter: "brightness(0.85)", position: "absolute", right: "15px", marginTop: "-22px"}}/>
                        
                        {/* DropDown */}
                        {showCSSAttributeList && <div style={{display: filteredList.length > 0 ? "block" : "none", zIndex: 800, marginLeft: "4px", maxWidth: "195px", height: `calc(26px * ${filteredList.length})`, overflow: "scroll", position: "absolute", width: "calc(100% - 30px)", backgroundColor: "black", maxHeight: "120px", borderBottomRightRadius: "10px", borderBottomLeftRadius: "10px", border: "0.3px solid white", borderTop: "none", paddingBottom: "5px"}}>
                          <>
                          {validCSSAttributes.filter(item1 => item1.startsWith(cssInputValue.toLowerCase())).map((item, index) => (
                            <div 
                            key={index} 
                            className="hover-dim" 
                            onClick={()=>{
                              setFilteredList([])
                              setShowCSSAttributeList(false)
                              setShowAddCSSAttribute1(false)
                              setShowAddCSSAttribute2(true)
                              setAttribute1(item)

                              setTimeout(() => {
                                if (attribute2InputRef.current) {
                                  attribute2InputRef.current.focus();
                                }
                              }, 20);
                            }}
                            style={{ height: '23px', width: '100%', padding: '5px 10px' }}>
                              {item}
                            </div>
                          ))}
                          </>
                        </div>}
                      </div>}

                      {showAddCSSAttribute2 && currentCSSItemIndex === index && cssEditingType === "class" && 
                      <div style={{marginBottom: "8px", display: "flex", flexDirection: "row", marginTop: "-5px"}}>
                        <div style={{marginRight: "8px"}}>{attribute1}</div>
                        {count1 > 0 && <input 
                          type="text"
                          ref={attribute2InputRef}
                          onKeyPress={async (e) => {
                            if (e.key === "Enter") {
                              await addCSSComplete(item, true)
                            }
                          }} 
                          id="attribute2Input"
                          value={attribute2}
                          onChange={(event)=>{if (!event.target.value.includes(";") && !event.target.value.includes("{") && !event.target.value.includes("}")) {setAttribute2(event.target.value.toLowerCase())}}}
                          style={{position: "absolute", right: "30px", width: `calc(100% - 56px - ${getStringWidth(attribute1)}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", paddingRight: "24px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                        />}
                        <BsTrash3Fill 
                          className="hover-dim" 
                          color="white" 
                          size={16}
                          onClick={()=>{
                            resetCSSPopup()
                          }}
                          style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                        />
                        <BsArrowRightCircleFill color="black" size={17} 
                        className="hover-dim"
                        onClick={async ()=>{
                          await addCSSComplete(item, true)
                        }}
                        style={{position: "absolute", right: "35px", marginTop: "2px", marginLeft: "1px"}}/>
                        
                      </div>}

                      {/* </CSSOutsideClickDetector> */}

                    </div>)
                    })
                  }
                </div>

              </div>}

              {optionsSelector === "imageTag" && <div 
                style={{padding: "10px 15px", position: "absolute", top: "115px", left: "180px", width: "calc(100% - 180px)", height: "calc(100% - 115px)", zIndex: 100, backgroundColor: "black", borderTop: "1px solid white"}}>
                <div style={{color: "white", fontWeight: "600", fontSize: "26px"}}>Styles</div>

                 {/* Ids */}
                 <div style={{marginTop: "4px"}}>
                  {Object.keys(currentCSSIDsObject).length > 0 && Object.keys(currentCSSIDsObject).map((item, index) => {
                    let values = currentCSSIDsObject[item]
                    return (<div key={index} style={{color: "white"}}>
                      <div style={{display: "flex", flexDirection: "row"}}>
                        <div style={{filter: "brightness(0.5)", color: "white", marginTop: "5px"}}>
                          {removeComments(item)}
                        </div>
                        <IoAddCircleOutline 
                          id="cssArrow"
                          color="white" 
                          onClick={()=>{
                            setShowPopup(true); 
                            setShowAddCSSAttribute1(true)
                            setCurrentCSSItemIndex(index)

                            setShowAddCSSAttribute2(false)
                            setAttribute1("")
                            setAttribute2("")
                            setFilteredList([])
                            setCSSInputValue("")

                            setCSSEditingType("id")
                            
                            setTimeout(() => {
                              if (id_cssInputRef.current) {
                                id_cssInputRef.current.focus();
                              }
                            }, 20);
                          }}
                          size={21} 
                          className="hover-dim"
                          style={{filter: "brightness(0.78)", marginTop: "4px", marginLeft: "4.5px"}}
                        />
                      </div>
                      <div style={{marginBottom: "15px"}}>{values.length > 0 && values.map((item2, index2) => {
                        let stringWidth = getStringWidth(removeComments(values[index2].split(":")[0]), "17px", "unset")
                        return (
                          <div style={{display: "flex", flexDirection: "row", marginTop: "9px"}}>
                            <div style={{marginRight: "8px"}}>{removeComments(values[index2].split(":")[0])}</div>
                            {count1 > 0 && <input 
                              type="text"
                              value={currentCSSIDsObject[item][index2].split(":").slice(1).join(":")}
                              onChange={(event)=>{
                                let currentCSSIDsObjectCopy = currentCSSIDsObject
                                currentCSSIDsObjectCopy[item][index2] = currentCSSIDsObject[item][index2].split(":")[0] + ":" + event.target.value
                                setCurrentCSSIDsObject(currentCSSIDsObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{position: "absolute", right: "30px", width: `calc(100% - 46px - ${stringWidth}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                            />}
                            <BsTrash3Fill 
                              className="hover-dim" 
                              color="white" 
                              size={16}
                              onClick={()=>{
                                let currentCSSIDsObjectCopy = currentCSSIDsObject
                                let array = currentCSSIDsObject[item]
                                let newArray = []
                                for (let i=0;i<array.length;i++) {
                                  if (array[i] !== currentCSSIDsObject[item][index2]) {
                                    newArray.push(array[i])
                                  }
                                }
                                currentCSSIDsObjectCopy[item] = newArray
                                setCurrentCSSIDsObject(currentCSSIDsObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                            />
                          </div>
                        )
                      })}
                      </div>
                      
                      {/* <CSSOutsideClickDetector onOutsideClick={() => {
                        console.log("outside")
                        handleCSSOutsideClick()
                        }}> */}
                      {showPopup && showAddCSSAttribute1 && currentCSSItemIndex === index && cssEditingType === "id" &&
                      <div id="cssArrowParent" style={{color: "white", width: "100%", marginTop: "-5px"}}>
                        <input 
                          ref={id_cssInputRef}
                          type="text"
                          value={cssInputValue}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (validCSSAttributes.includes(cssInputValue)) {
                                setFilteredList([])
                                setShowCSSAttributeList(false)
                                setShowAddCSSAttribute1(false)
                                setShowAddCSSAttribute2(true)
                                setAttribute1(cssInputValue)

                                setTimeout(() => {
                                  if (id_attribute2InputRef.current) {
                                    id_attribute2InputRef.current.focus();
                                  }
                                }, 20);
                              }
                            }
                          }} 
                          onChange={(e)=>{
                            setCSSInputValue(e.target.value.toLowerCase())
                            setFilteredList(
                              validCSSAttributes.filter(item1 => item1.startsWith(e.target.value.toLowerCase()))
                            )
                            if (e.target.value.length === 0) {
                              setShowCSSAttributeList(false)
                            } else if (!showCSSAttributeList) {
                              setShowCSSAttributeList(true)
                            }
                          }}
                          style={{fontSize: "17px", width: "calc(100% - 22px)", height: "21px", backgroundColor: "transparent", color: "white", border: "none", outline: "none"}}
                        />
                        <div style={{height: "0.3px", marginTop: "4px", width: "100%", backgroundColor: "white"}}></div>
                        <BsArrowRightCircleFill color="white" size={17} 
                        className="hover-dim"
                        onClick={()=>{
                          if (validCSSAttributes.includes(cssInputValue)) {
                            setFilteredList([])
                            setShowCSSAttributeList(false)
                            setShowAddCSSAttribute1(false)
                            setShowAddCSSAttribute2(true)
                            setAttribute1(cssInputValue)

                            setTimeout(() => {
                              if (id_attribute2InputRef.current) {
                                id_attribute2InputRef.current.focus();
                              }
                            }, 20);
                          }
                        }}
                        style={{filter: "brightness(0.85)", position: "absolute", right: "15px", marginTop: "-22px"}}/>
                        
                        {/* DropDown */}
                        {showCSSAttributeList && <div style={{display: filteredList.length > 0 ? "block" : "none", zIndex: 800, marginLeft: "4px", maxWidth: "195px", height: `calc(26px * ${filteredList.length})`, overflow: "scroll", position: "absolute", width: "calc(100% - 30px)", backgroundColor: "black", maxHeight: "120px", borderBottomRightRadius: "10px", borderBottomLeftRadius: "10px", border: "0.3px solid white", borderTop: "none", paddingBottom: "5px"}}>
                          <>
                          {validCSSAttributes.filter(item1 => item1.startsWith(cssInputValue.toLowerCase())).map((item, index) => (
                            <div 
                            key={index} 
                            className="hover-dim" 
                            onClick={()=>{
                              setFilteredList([])
                              setShowCSSAttributeList(false)
                              setShowAddCSSAttribute1(false)
                              setShowAddCSSAttribute2(true)
                              setAttribute1(item)

                              setTimeout(() => {
                                if (id_attribute2InputRef.current) {
                                  id_attribute2InputRef.current.focus();
                                }
                              }, 20);
                            }}
                            style={{ height: '23px', width: '100%', padding: '5px 10px' }}>
                              {item}
                            </div>
                          ))}
                          </>
                        </div>}
                      </div>}

                      {showAddCSSAttribute2 && currentCSSItemIndex === index && cssEditingType === "id" && 
                      <div style={{marginBottom: "8px", display: "flex", flexDirection: "row", marginTop: "-5px"}}>
                        <div style={{marginRight: "8px"}}>{attribute1}</div>
                        {count1 > 0 && <input 
                          type="text"
                          ref={id_attribute2InputRef}
                          onKeyPress={async (e) => {
                            if (e.key === "Enter") {
                              await addCSSComplete(item, false)
                            }
                          }} 
                          id="attribute2Input"
                          value={attribute2}
                          onChange={(event)=>{if (!event.target.value.includes(";") && !event.target.value.includes("{") && !event.target.value.includes("}")) {setAttribute2(event.target.value.toLowerCase())}}}
                          style={{position: "absolute", right: "30px", width: `calc(100% - 56px - ${getStringWidth(attribute1)}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", paddingRight: "24px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                        />}
                        <BsTrash3Fill 
                          className="hover-dim" 
                          color="white" 
                          size={16}
                          onClick={()=>{
                            resetCSSPopup()
                          }}
                          style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                        />
                        <BsArrowRightCircleFill color="black" size={17} 
                        className="hover-dim"
                        onClick={async ()=>{
                          await addCSSComplete(item, false)
                        }}
                        style={{position: "absolute", right: "35px", marginTop: "2px", marginLeft: "1px"}}/>
                        
                      </div>}

                      {/* </CSSOutsideClickDetector> */}

                    </div>)
                    })
                  }
                </div>


                {/* Classes */}
                <div style={{marginTop: "4px"}}>
                  {Object.keys(currentCSSClassesObject).length > 0 && Object.keys(currentCSSClassesObject).map((item, index) => {
                    let values = currentCSSClassesObject[item]
                    return (<div key={index} style={{color: "white"}}>
                      <div style={{display: "flex", flexDirection: "row"}}>
                        <div style={{filter: "brightness(0.5)", color: "white", marginTop: "5px"}}>
                          {removeComments(item)}
                        </div>
                        <IoAddCircleOutline 
                          id="cssArrow"
                          color="white" 
                          onClick={()=>{
                            setShowPopup(true); 
                            setShowAddCSSAttribute1(true)
                            setCurrentCSSItemIndex(index)

                            setShowAddCSSAttribute2(false)
                            setAttribute1("")
                            setAttribute2("")
                            setFilteredList([])
                            setCSSInputValue("")

                            setCSSEditingType("class")
                            
                            setTimeout(() => {
                              if (cssInputRef.current) {
                                cssInputRef.current.focus();
                              }
                            }, 20);
                          }}
                          size={21} 
                          className="hover-dim"
                          style={{filter: "brightness(0.78)", marginTop: "4px", marginLeft: "4.5px"}}
                        />
                      </div>
                      <div style={{marginBottom: "15px"}}>{values.length > 0 && values.map((item2, index2) => {
                        let stringWidth = getStringWidth(removeComments(values[index2].split(":")[0]), "17px", "unset")
                        return (
                          <div style={{display: "flex", flexDirection: "row", marginTop: "9px"}}>
                            <div style={{marginRight: "8px"}}>{removeComments(values[index2].split(":")[0])}</div>
                            {count1 > 0 && <input 
                              type="text"
                              value={currentCSSClassesObject[item][index2].split(":").slice(1).join(":")}
                              onChange={(event)=>{
                                let currentCSSClassesObjectCopy = currentCSSClassesObject
                                currentCSSClassesObjectCopy[item][index2] = currentCSSClassesObject[item][index2].split(":")[0] + ":" + event.target.value
                                setCurrentCSSClassesObject(currentCSSClassesObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{position: "absolute", right: "30px", width: `calc(100% - 46px - ${stringWidth}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                            />}
                            <BsTrash3Fill 
                              className="hover-dim" 
                              color="white" 
                              size={16}
                              onClick={()=>{
                                let currentCSSClassesObjectCopy = currentCSSClassesObject
                                let array = currentCSSClassesObject[item]
                                let newArray = []
                                for (let i=0;i<array.length;i++) {
                                  if (array[i] !== currentCSSClassesObject[item][index2]) {
                                    newArray.push(array[i])
                                  }
                                }
                                currentCSSClassesObjectCopy[item] = newArray
                                setCurrentCSSClassesObject(currentCSSClassesObjectCopy)
                                setCount1(count1 + 1)
                              }}
                              style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                            />
                          </div>
                        )
                      })}
                      </div>
                      
                      {/* <CSSOutsideClickDetector onOutsideClick={() => {
                        console.log("outside")
                        handleCSSOutsideClick()
                        }}> */}
                      {showPopup && showAddCSSAttribute1 && currentCSSItemIndex === index && cssEditingType === "class" &&
                      <div id="cssArrowParent" style={{color: "white", width: "100%", marginTop: "-5px"}}>
                        <input 
                          ref={cssInputRef}
                          type="text"
                          value={cssInputValue}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (validCSSAttributes.includes(cssInputValue)) {
                                setFilteredList([])
                                setShowCSSAttributeList(false)
                                setShowAddCSSAttribute1(false)
                                setShowAddCSSAttribute2(true)
                                setAttribute1(cssInputValue)

                                setTimeout(() => {
                                  if (attribute2InputRef.current) {
                                    attribute2InputRef.current.focus();
                                  }
                                }, 20);
                              }
                            }
                          }} 
                          onChange={(e)=>{
                            setCSSInputValue(e.target.value.toLowerCase())
                            setFilteredList(
                              validCSSAttributes.filter(item1 => item1.startsWith(e.target.value.toLowerCase()))
                            )
                            if (e.target.value.length === 0) {
                              setShowCSSAttributeList(false)
                            } else if (!showCSSAttributeList) {
                              setShowCSSAttributeList(true)
                            }
                          }}
                          style={{fontSize: "17px", width: "calc(100% - 22px)", height: "21px", backgroundColor: "transparent", color: "white", border: "none", outline: "none"}}
                        />
                        <div style={{height: "0.3px", marginTop: "4px", width: "100%", backgroundColor: "white"}}></div>
                        <BsArrowRightCircleFill color="white" size={17} 
                        className="hover-dim"
                        onClick={()=>{
                          if (validCSSAttributes.includes(cssInputValue)) {
                            setFilteredList([])
                            setShowCSSAttributeList(false)
                            setShowAddCSSAttribute1(false)
                            setShowAddCSSAttribute2(true)
                            setAttribute1(cssInputValue)

                            setTimeout(() => {
                              if (attribute2InputRef.current) {
                                attribute2InputRef.current.focus();
                              }
                            }, 20);
                          }
                        }}
                        style={{filter: "brightness(0.85)", position: "absolute", right: "15px", marginTop: "-22px"}}/>
                        
                        {/* DropDown */}
                        {showCSSAttributeList && <div style={{display: filteredList.length > 0 ? "block" : "none", zIndex: 800, marginLeft: "4px", maxWidth: "195px", height: `calc(26px * ${filteredList.length})`, overflow: "scroll", position: "absolute", width: "calc(100% - 30px)", backgroundColor: "black", maxHeight: "120px", borderBottomRightRadius: "10px", borderBottomLeftRadius: "10px", border: "0.3px solid white", borderTop: "none", paddingBottom: "5px"}}>
                          <>
                          {validCSSAttributes.filter(item1 => item1.startsWith(cssInputValue.toLowerCase())).map((item, index) => (
                            <div 
                            key={index} 
                            className="hover-dim" 
                            onClick={()=>{
                              setFilteredList([])
                              setShowCSSAttributeList(false)
                              setShowAddCSSAttribute1(false)
                              setShowAddCSSAttribute2(true)
                              setAttribute1(item)

                              setTimeout(() => {
                                if (attribute2InputRef.current) {
                                  attribute2InputRef.current.focus();
                                }
                              }, 20);
                            }}
                            style={{ height: '23px', width: '100%', padding: '5px 10px' }}>
                              {item}
                            </div>
                          ))}
                          </>
                        </div>}
                      </div>}

                      {showAddCSSAttribute2 && currentCSSItemIndex === index && cssEditingType === "class" && 
                      <div style={{marginBottom: "8px", display: "flex", flexDirection: "row", marginTop: "-5px"}}>
                        <div style={{marginRight: "8px"}}>{attribute1}</div>
                        {count1 > 0 && <input 
                          type="text"
                          ref={attribute2InputRef}
                          onKeyPress={async (e) => {
                            if (e.key === "Enter") {
                              await addCSSComplete(item, true)
                            }
                          }} 
                          id="attribute2Input"
                          value={attribute2}
                          onChange={(event)=>{if (!event.target.value.includes(";") && !event.target.value.includes("{") && !event.target.value.includes("}")) {setAttribute2(event.target.value.toLowerCase())}}}
                          style={{position: "absolute", right: "30px", width: `calc(100% - 56px - ${getStringWidth(attribute1)}px)`, marginBottom: "10px", borderRadius: "5px", fontSize: "17px", paddingLeft: "5px", paddingRight: "24px", border: "none", height: "21px", color: "black", backgroundColor: "white"}}
                        />}
                        <BsTrash3Fill 
                          className="hover-dim" 
                          color="white" 
                          size={16}
                          onClick={()=>{
                            resetCSSPopup()
                          }}
                          style={{filter: "brightness(0.85)", marginTop: "1.5px", position: "absolute", right: "6px", cursor: "pointer"}}
                        />
                        <BsArrowRightCircleFill color="black" size={17} 
                        className="hover-dim"
                        onClick={async ()=>{
                          await addCSSComplete(item, true)
                        }}
                        style={{position: "absolute", right: "35px", marginTop: "2px", marginLeft: "1px"}}/>
                        
                      </div>}

                      {/* </CSSOutsideClickDetector> */}

                    </div>)
                    })
                  }
                </div>

              </div>}

              {/* Edits  */}
              <h2 style={{color: "white", padding: "5px 10px", paddingLeft: "16.5px", paddingTop: "10px", fontSize: "28px"}}> 
              {currentElementPath.split("/").pop() === "Text" ? 
              removeAsterisks(currentElementPath.split("/").pop())
              :
              `<` + removeAsterisks(currentElementPath.split("/").pop()) + `>` 
              } 
              </h2>

              {/* TEXT EDITS */}
              {showAddTextInput && <>
                <input
                type="text"
                value={cssTextValue}
                onChange={(event) => {
                  setCSSTextValue(event.target.value);
                  if (clickedTrash) {setClickedTrash(false)}
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    saveEdits("");
                  }
                }}
                style={{
                  padding: "5px",
                  paddingLeft: "7px",
                  fontSize: "15px",
                  marginLeft: "16.5px",
                  border: "none",
                  backgroundColor: "white",
                  borderRadius: "5px",
                  width: "calc(100% - 33px - 15px)",
                  height: "24px"
                }}
                />

                {!clickedTrash && <BsTrash3Fill 
                  className="hover-dim" 
                  color="white" 
                  onClick={()=>{
                    setBackupText(cssTextValue)
                    setCSSTextValue("")
                    setClickedTrash(true)
                  }}
                  style={{filter: "brightness(0.85)", position: "absolute", marginTop: "2.5px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}

                {clickedTrash && <FaUndoAlt
                  className="hover-dim" 
                  color="white" 
                  onClick={()=>{
                    setCSSTextValue(backupText)
                    setClickedTrash(false)
                  }}
                  style={{position: "absolute", marginTop: "1px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}

              </>}

               {/* IMAGE SRC EDITS */}
              {showImgSRCInput && <>
                <input
                type="text"
                value={imgSRCValue}
                onChange={(event) => {
                  setImgSRCValue(event.target.value);
                  if (clickedTrash) {setClickedTrash(false)}
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    saveEdits("");
                  }
                }} 
                style={{
                  padding: "5px",
                  paddingLeft: "7px",
                  fontSize: "15px",
                  marginLeft: "16.5px",
                  border: "none",
                  backgroundColor: "white",
                  borderRadius: "5px",
                  width: "calc(100% - 33px - 15px)",
                  height: "24px"
                }}
                />
                {!clickedTrash && <BsTrash3Fill 
                className="hover-dim" 
                color="white" 
                onClick={()=>{
                  setBackupText(imgSRCValue)
                  setImgSRCValue("")
                  setClickedTrash(true)
                }}
                style={{filter: "brightness(0.85)", position: "absolute", marginTop: "2.5px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}

                {clickedTrash && <FaUndoAlt
                className="hover-dim" 
                color="white" 
                onClick={()=>{
                  setImgSRCValue(backupText)
                  setClickedTrash(false)
                }}
                style={{position: "absolute", marginTop: "1px", right: "9px", marginLeft: "5px", cursor: "pointer"}}
                />}    

                <div style={{cursor: "pointer", width: "calc(100% - 32px)", marginLeft: "16px", height: "32px", marginTop: "10px", display: "flex", flexDirection: "row", gap: "8px"}}>
                  <div 
                    onClick={()=>{setOptionsSelector("image")}}
                    className="hover-dim"
                    style={{filter: optionsSelector === "image" ? "none" : "brightness(0.5)", border: "1px solid white", borderBottom: "none", width: "calc(50% - 4px)", height: "100%", borderTopLeftRadius: "10px", borderTopRightRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontSize: "20px", fontWeight: "600"}}>
                    Content
                  </div>
                  <div 
                    onClick={()=>{setOptionsSelector("imageTag")}}
                    className="hover-dim"
                    style={{filter: optionsSelector === "imageTag" ? "none" : "brightness(0.5)", cursor: "pointer", border: "1px solid white", borderBottom: "none", width: "calc(50% - 4px)", height: "100%", borderTopLeftRadius: "10px", borderTopRightRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontSize: "20px", fontWeight: "600"}}>
                    Styles
                  </div>
                </div>
              </>}

              {/* SAVE EDITS */}
              <div 
                className="hover-dim"
                style={{cursor: "pointer", border: "1px solid white", backgroundColor: "black", position: "absolute", top: "12.5px", right: "8.5px", width: "70px", fontSize: "21px", fontWeight: "600", height: "28px", borderRadius: "10px", padding: "10px 20px", display: "flex", justifyContent: "center", alignItems: "center", color: "white"}}
                onClick={()=>{saveEdits("")}}>
                Save
              </div>

              {/* Link */}
              {removeAsterisks(currentElementPath.split("/").pop()) !== "Link" && removeAsterisks(currentElementPath.split("/").pop()) !== "a" && <div 
                className="hover-dim"
                style={{cursor: "pointer", position: "absolute", top: "12.5px", right: "86px"}}
                onClick={()=>{}}
              >
                <FaLink onClick={()=>{setSelectingLink(true);
                   setSelectingLinkStep1(true)
                   setSelectingLinkStep2(false)
                   }} color={linkActive ? "rgb(33, 200, 255)" : aTagActive ? "rgb(33, 200, 255)" : "white"} size={23}/>
              </div>}

               {/* Link Window */}
              {selectingLink &&  
               <OutsideClickDetector onOutsideClick={() => {handleLinkOutsideClick()}}>
                <div style={{position: "absolute", top: "45px", gap: "2%", right: "20px", height: "35px", width: "140px", bottom: "40px", backgroundColor: "black", border: "1px solid white", borderRadius: "13px", zIndex: 998, display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", padding: "4px"}}>

                  {selectingLinkStep1 && <><button style={{ width: "64px", height: "100%", backgroundColor: "white", whiteSpace: "nowrap", color: "white", borderRadius: "10px", fontSize: "14px",  display: "flex", justifyContent: "center", alignItems: "center"}} 
                    className="prompt-button hover-dim"
                    onClick={async () => {
                      setSelectingLinkStep1(false)
                      setSelectingLinkStep2(true)
                      setSelectionChoice("a")
                      setaTagActive(true)
                      setLinkActive(false)
                      setTimeout(() => {
                        if (aTagInput.current) {
                          aTagInput.current.focus();
                        }
                      }, 20);
                    }}>
                      <p style={{fontSize: "16px", color: "black", fontWeight: "bold"}}>a</p>
                  </button> 

                  <button style={{ width: "64px", marginLeft: "6px", height: "100%", backgroundColor: "white", whiteSpace: "nowrap", color: "white", borderRadius: "10px", fontSize: "14px",  display: "flex", justifyContent: "center", alignItems: "center"}} 
                    className="prompt-button hover-dim"
                    onClick={async () => {
                      setSelectingLinkStep1(false)
                      setSelectingLinkStep2(true)
                      setSelectionChoice("Link")
                      setLinkActive(true)
                      setaTagActive(false)
                    }}>
                      <p style={{fontSize: "16px", color: "black", fontWeight: "bold"}}>Link</p>
                  </button></>}

                  {selectingLinkStep2 && selectionChoice === "Link" && 
                  <div>
                    
                      <select id="dropdown2" value={currentLinkChoice} onChange={handleDropdownChoiceChange}>
                        {pageNames.map((option, index) => (
                          <option key={index} value={option.toLowerCase()}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <IoClose color="white" className="hover-dim"
                      onClick={()=>{
                        setLinkActive(false)
                        setSelectingLink(false)
                        setSelectingLinkStep1(false)
                        setSelectingLinkStep2(false)
                      }}
                      size={24}
                      style={{position: "absolute", right: "5px", top: "5px"}}/>
                    
                  </div>}

                  {selectingLinkStep2 && selectionChoice === "a" && 
                  <div>
                    <input
                      type="text"
                      ref={aTagInput}
                      value={selectingaTagInputValue}
                      onChange={(event) => {
                        setSelectingaTagInputValue(event.target.value);
                      }}
                      onKeyPress={async (e) => {
                        if (e.key === "Enter") {
                          await saveEdits("");
                        }
                      }} 
                      style={{
                        padding: "5px",
                        paddingLeft: "7px",
                        fontSize: "15px",
                        marginLeft: "5px",
                        border: "none",
                        backgroundColor: "white",
                        borderRadius: "5px",
                        width: "calc(100% - 33px)",
                        height: "24px"
                      }}
                    />
                      <IoClose color="white" className="hover-dim"
                      onClick={()=>{
                        setaTagActive(false)
                        setSelectingaTagInputValue("")
                        setSelectingLink(false)
                        setSelectingLinkStep1(false)
                        setSelectingLinkStep2(false)
                      }}
                      size={24}
                      style={{position: "absolute", right: "5px", top: "5px"}}/>
                    
                  </div>}

                </div>
                </OutsideClickDetector> }
               

            </>}
          </div>
        </div>
      </div>}


      {/* CSS Selector */}
      {/* {showPopup && <div style={{position: "absolute", height: "100%", width: "50vw", zIndex: 900}}>
        <div style={{position: "absolute", height: "100%", width: "100%", backgroundColor: "black", opacity: 0.4}}></div>
          <div style={{position: "absolute", height: "100%", width: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
              <div style={{position: "relative", marginTop: "-15vh", height: "260px", width: "400px", maxWidth: "80%", borderRadius: "15px", backgroundColor: "black", border: "1px solid white", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "10px"}}>
                <div className="hover-dim" style={{filter: "brightness(0.5)", position: "absolute", top: "10px", right: "10px", cursor: "pointer"}} 
                  onClick={()=>{setShowPopup(false)}} ><IoClose color="white" size={35}/>
                </div>

                <div style={{color: "white"}}>
          <h2>Select an option:</h2>
          <ul>
            {selectionList.map((item, index) => (
              <li key={index} onClick={() => handleSelectItem(item)}>
                {item}
              </li>
            ))}
          </ul>
        </div>

              </div>

        </div>
      </div>} */}
      

    </div>
  );
};

export default ReactAI