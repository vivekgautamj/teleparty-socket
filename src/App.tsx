import { useEffect, useState, useRef } from "react";
import {
  SocketEventHandler,
  SocketMessageTypes,
  TelepartyClient,
} from "teleparty-websocket-lib";

interface User {
  userSettings?: {
    userNickname?: string;
  };
}

interface Message {
  message: string;
  nickname: string;
  isSystemMessage: boolean;
  time: string;
  timestamp: string;
  icon?: string;
}

const App = () => {
  const [nickname, setNickname] = useState<string | null>(null);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userList, setUserList] = useState<User[]>([]);
  const [typing, setTyping] = useState<boolean>(false);

  const clientRef = useRef<TelepartyClient | null>(null);

  useEffect(() => {
    const eventHandler: SocketEventHandler = {
      onConnectionReady: () => {
        console.log("Connection has been established");
      },
      onClose: () => {
        console.log("Socket has been closed");
      },
      onMessage: (message) => {
        console.log("Received message", message);
        const { data, type } = message;
        switch (type) {
          case "userId": {
            setUserId(data.userId);
            break;
          }
          case "userList": {
            setUserList(data as User[]);
            break;
          }
          case "sendMessage": {
            const msgPayload: Message = {
              message: data.body,
              nickname: data.userNickname || "Unknown User", // Handle undefined
              isSystemMessage: data.isSystemMessage,
              time: new Date(data.timestamp).toLocaleString(),
              timestamp: data.timestamp,
              icon: data.userIcon || "", // Handle undefined icon
            };
            setMessages((prevMessages) => [...prevMessages, msgPayload]);
            break;
          }
          case "setTypingPresence": {
            setTyping(true);
            break;
          }
          default:
            console.warn(`Unhandled message type: ${type}`);
        }
      },
    };

    clientRef.current = new TelepartyClient(eventHandler);

    return () => {
      clientRef.current?.teardown();
    };
  }, []);

  const createRoom = async () => {
    if (nickname && clientRef.current) {
      try {
        const roomId = await clientRef.current.createChatRoom(nickname, "");
        setRoomIds((prevRoomIds) => [...prevRoomIds, roomId]);
        setSelectedRoomId(roomId);
        console.log("Created room with ID:", roomId);
      } catch (error) {
        console.error("Error creating room:", error);
      }
    } else {
      console.log("Nickname and client are required to create a room.");
    }
  };

  const joinRoom = async (roomId: string) => {
    if (roomId && clientRef.current && nickname) {
      setSelectedRoomId(roomId);
      setMessages([]); // Clear previous messages when joining a new room.
  
      try {
        const oldMessages = await clientRef.current.joinChatRoom(nickname, roomId);
  
        if (Array.isArray(oldMessages.messages)) {
          const previousMsgs: Message[] = oldMessages.messages.map((msg) => {
            return {
              message: msg.body,
              nickname: msg.userNickname || "Unknown User", // Fallback to "Unknown User" if userNickname is undefined
              isSystemMessage: msg.isSystemMessage,
              time: new Date(msg.timestamp).toLocaleString(),
              timestamp: new Date(msg.timestamp).toString(), // Convert timestamp to string
              icon: msg.userIcon || "", // Use default empty string if icon is undefined
            };
          });
          
  
          // Explicitly typing the previousMsgs as an array of Message to avoid type inference issues
          setMessages((prevMessages) => [...prevMessages, ...previousMsgs]);
        } else {
          console.error("Expected an array of messages, but got:", oldMessages);
        }
      } catch (error) {
        console.error("Error joining room:", error);
      }
    } else {
      console.log("Nickname and Room ID are required to join a room.");
    }
  };
  

  const handleSendMessage = (setTypingPresence = false) => {
    if (
      !nickname ||
      !selectedRoomId ||
      (!messageInput.trim() && !setTypingPresence)
    ) {
      console.log(
        "You must be in a room, have a nickname, and type a message to send."
      );
      return;
    }

    const message = {
      body: setTypingPresence ? "" : messageInput,
      isSystemMessage: setTypingPresence,
    };

    const typeOfMessage = setTypingPresence
      ? SocketMessageTypes.SET_TYPING_PRESENCE
      : SocketMessageTypes.SEND_MESSAGE;

    clientRef.current?.sendMessage(typeOfMessage, message, (data) => {
      console.log("Message sent", data);
    });

    if (!setTypingPresence) {
      setMessageInput("");
      setTyping(false);
    }
  };

  const handleSetNickname = () => {
    const userNickname = prompt("Enter your nickname:");
    if (userNickname) {
      setNickname(userNickname);
      console.log("Nickname set:", userNickname);
    } else {
      console.log("Nickname not set");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "30%",
          borderRight: "2px solid #ccc",
          paddingRight: "20px",
        }}
      >
        <h2>Created Rooms</h2>
        <ul>
          {roomIds.length === 0 ? (
            <p>No rooms created yet.</p>
          ) : (
            roomIds.map((room, index) => (
              <li key={index}>
                <button
                  onClick={() => setSelectedRoomId(room)}
                  style={{
                    padding: "10px",
                    margin: "5px",
                    backgroundColor:
                      room === selectedRoomId ? "#4CAF50" : "#ddd",
                    color: room === selectedRoomId ? "white" : "black",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {room}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div style={{ width: "65%", paddingLeft: "20px" }}>
        <h1>Teleparty Chat App</h1>
        {userId && <div>User Id: {userId}</div>}

        {!nickname ? (
          <button
            onClick={handleSetNickname}
            style={{
              padding: "10px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Set Nickname
          </button>
        ) : (
          <div>Nickname: {nickname}</div>
        )}
        {nickname && (
          <>
            <button
              onClick={createRoom}
              style={{
                padding: "10px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                margin: "10px",
              }}
            >
              Create New Chat Room
            </button>
            <button
              onClick={() => {
                const roomId = prompt("Enter Room ID to join:");
                if (roomId) joinRoom(roomId);
              }}
              style={{
                padding: "10px",
                backgroundColor: "#008CBA",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                margin: "10px",
              }}
            >
              Join Chat Room
            </button>
          </>
        )}
        {selectedRoomId && (
          <div>
            <h3>Room ID: {selectedRoomId}</h3>
            <h3>
              Users Count: {userList.length}
              {userList.map((user, index) => (
                <div key={index}>
                  {user.userSettings?.userNickname || "Unknown User"}
                </div>
              ))}
            </h3>
            <div
              style={{
                marginBottom: "10px",
                height: "200px",
                overflowY: "auto",
                border: "1px solid #ccc",
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <strong>
                    {msg.isSystemMessage ? (
                      <div
                        style={{
                          backgroundColor: "#dfdfdf",
                          padding: "5px 10px",
                          borderRadius: "5px",
                        }}
                      >
                        {msg.nickname}: {msg.message} ---- <sub>{msg.time}</sub>
                      </div>
                    ) : (
                      <div>
                        {msg.nickname}: {msg.message} ---- <sub>{msg.time}</sub>
                      </div>
                    )}
                  </strong>
                </div>
              ))}
            </div>
            {typing && <div>Typing ...</div>}
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message here..."
              style={{
                padding: "10px",
                margin: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "80%",
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              style={{
                padding: "10px",
                backgroundColor: "#008CBA",
                color: "white",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
