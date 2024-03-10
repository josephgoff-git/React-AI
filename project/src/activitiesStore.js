import { MdOutlineSignalCellularNull } from "react-icons/md";
import { create } from "zustand";

export const useHasFilesStore = create((set) => ({
  hasFiles: false,
  setHasFiles: (newHasFiles) => set({ hasFiles: newHasFiles }),
}));

export const useShowEditorStore = create((set) => ({
  showEditor: false,
  setShowEditor: (newShowEditor) => set({ showEditor: newShowEditor }),
}));

export const useShowGPTStore = create((set) => ({
  showGPT: false,
  setShowGPT: (newShowGPT) => set({ showGPT: newShowGPT }),
}));

export const useShowUploadStore = create((set) => ({
  showUpload: true,
  setShowUpload: (newShowUpload) => set({ showUpload: newShowUpload }),
}));

export const useFirstBuildStore = create((set) => ({
  firstBuild: true,
  setFirstBuild: (newFirstBuild) => set({ firstBuild: newFirstBuild }),
}));

export const useClickedNewAppStore = create((set) => ({
  clickedNewApp: false,
  setClickedNewApp: (newClickedNewApp) => set({ clickedNewApp: newClickedNewApp }),
}));

export const useProjectTitleStore = create((set) => ({
  projectTitle: "react-app",
  setProjectTitle: (newProjectTitle) => set({ projectTitle: newProjectTitle }),
}));

export const useCurrentStackStore = create((set) => ({
  currentStack: [],
  setCurrentStack: (newCurrentStack) => set({ currentStack: newCurrentStack }),
}));

export const useComponentIndexOverStore = create((set) => ({
  componentIndexOver: null,
  setComponentIndexOver: (newComponentIndexOver) => set({ componentIndexOver: newComponentIndexOver }),
}));






export const useWidthStore = create((set) => ({
  width: 200,
  setWidth: (newWidth) => set({ width: newWidth }),
}));

export const useHeightStore = create((set) => ({
  height: 200,
  setHeight: (newHeight) => set({ height: newHeight }),
}));

export const useXValStore = create((set) => ({
  xVal: 100,
  setXVal: (newXVal) => set({ xVal: newXVal }),
}));

export const useYValStore = create((set) => ({
  yVal: 100,
  setYVal: (newYVal) => set({ yVal: newYVal }),
}));



export const useDisplayColorStore = create((set) => ({
  displayColor: "black",
  setDisplayColor: (newDisplayColor) => set({ displayColor: newDisplayColor }),
}));