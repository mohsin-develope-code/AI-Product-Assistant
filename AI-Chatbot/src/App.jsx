import React, { useState } from "react";
import axios from "axios";
import ChatIndicator from './ChatIndicator';




function App() {

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

      

  async function sendMessage() {

    setIsThinking(true);

    if (!input.trim()) return;

    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");



    const response = await axios.get("https://chatbot-backend-stmt.onrender.com/ai-details",
                                     {
                                      params: {
                                      data: input,
                                     },
                                    }
    );


    if(response){
      setMessages((prev) => [...prev, {sender: "", text: response.data}]);
      setIsThinking(false)

    }


}





  return (


    <>

    
    <div className="flex items-center justify-center h-screen w-full   bg-yellow-100">


      <div className="w-[60%]  bg-white shadow-lg rounded-xl p-4">

         <h1 className="text-xl font-bold mb-4 text-center">
          Ask Product Query
         </h1>



        <div className="h-96 overflow-y-auto border p-2 rounded mb-3">
          {messages?.map((msg, index) => (
            <div
              key={index}
              className={`my-2 p-2 rounded-lg ${
                msg.sender === "user"
                  ? "bg-blue-100 self-end text-right"
                  : "bg-gray-200 text-left text-black"
              }`}
            >


              <strong>{msg.sender === "user" ? "You" : "Gemini"}: </strong>
              
              { msg.text.split(/[,\n]+/).map((line, index) => (
                         <React.Fragment key={index}>
                           {line}
                           <br />
                         </React.Fragment>
                       ))}


            </div>
          ))}

          {isThinking && (
          <div className="bg-gray-300 inline-block p-2 rounded-lg">
            <ChatIndicator />
          </div>
           )}

        </div>



        <div className="flex">
          <input
            type="text"
            className="flex-1 border rounded-l-lg p-2 outline-none"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded-r-lg"
          >
            Send
          </button>
        </div>
      </div>


    </div>

    </>


























































    
  )
}

export default App
