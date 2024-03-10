import React, { useRef, useState } from 'react';
import "./GPT.scss";
import GPTlogo from "../assets/ai.png";
import user from "../assets/user.png"
import logo from "../assets/logo.png"
import send from "../assets/send.svg";
import Header from "../Header/Header"
import { LuSend } from "react-icons/lu"
import { useHasFilesStore, useShowEditorStore, useShowGPTStore } from "../activitiesStore"
import axios from "axios";
import server from "../serverConfig.js"

// height: -webkit-fill-available

const GPT = () => {

  var hasFiles = useHasFilesStore((state) => state.hasFiles);
  const setHasFiles = useHasFilesStore((state) => state.setHasFiles);

  var showEditor = useShowEditorStore((state) => state.showEditor);
  const setShowEditor = useShowEditorStore((state) => state.setShowEditor);

  var showGPT = useShowGPTStore((state) => state.showGPT);
  const setShowGPT = useShowGPTStore((state) => state.setShowGPT);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState("")
  const loaderRef = useRef(null); 
  const formRef = useRef(null);

  const handleTextareaKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current.requestSubmit();
    }
  };
        
  function startLoadingAnimation() {
    if (!isLoading) {
      setIsLoading(true);
      loaderRef.current = setInterval(() => {
        setLoading(prevLoading => prevLoading.length < 3 ? prevLoading + "." : "");
      }, 160);
    }
  }

  function stopLoadingAnimation() {
    setIsLoading(false);
    clearInterval(loaderRef.current);
    setLoading("");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = new FormData(form);

    const userMessage = data.get("prompt");
    setMessages((prevMessages) => [...prevMessages, { text: userMessage, isBot: false }]);
    form.reset();

    startLoadingAnimation(); 
    setIsLoading(true);

    try {
      const botMessage = await getMessage([...messages, { text: userMessage, isBot: false }]);
      setMessages((prevMessages) => [...prevMessages, { text: botMessage, isBot: true }]);
    } catch (error) {
      console.error(error);
      setMessages((prevMessages) => [...prevMessages, { text: "Something went wrong...", isBot: true }]);
    } finally {
      stopLoadingAnimation();
    }
  };

  async function getMessage(messages) {
    // const proxyUrl = 'http://localhost:3001/gpt-message';
    // const proxyUrl = 'https://reactaiplayground.azurewebsites.net/gpt-message';

    const proxyUrl = `${server}/gpt-message`
    try {
      const response = await axios.post(proxyUrl, { messages });
      return response.data
    } catch (error) {
      return 'Something went wrong...'
    }
  }

  return (
    <div id="gpt">
      <div id="messages">
        {messages.map((message, index) => (
          <div className={`bar ${message.isBot ? 'ai' : ''}`} key={index}>
            <div className="elements">
              <div className="image">
                <img src={message.isBot ? GPTlogo : user} alt={message.isBot ? 'bot' : 'user'} />
              </div>
              <div className="message">{message.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="bar ai">
            <div className="elements">
              <div className="image">
                <img src={GPTlogo} alt="bot"/>
              </div>
              <div className="message">{loading}</div>
            </div>
          </div>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit} ref={formRef}>
        <textarea onKeyPress={handleTextareaKeyPress} style={{ resize: "none" }} name="prompt" rows="1" cols="1" placeholder="Ask me something..."></textarea>
        <button type="submit" style={{paddingRight: "10px"}}>
          <LuSend color="white" fontSize={25} style={{transform: "rotate(45deg)"}}/>
        </button>
      </form>
    </div>
  );
};

export default GPT;