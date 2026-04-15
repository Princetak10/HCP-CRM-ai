import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setLoading } from '../store/chatSlice';
import { fillFormFromAI } from '../store/interactionSlice';
import { sendChat } from '../api/interactionApi';

export default function ChatPanel() {
    const dispatch = useDispatch();
    const { messages, loading } = useSelector((s) => s.chat);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        dispatch(addMessage({ role: 'user', content: text }));
        setInput('');
        dispatch(setLoading(true));

        try {
            const res = await sendChat(text);
            const { reply, structured_data, action } = res.data;

            dispatch(addMessage({ role: 'ai', content: reply, structured_data, action }));

            // Immediately fill form structure
            if (action === 'log_interaction' && structured_data && Object.keys(structured_data).length > 0) {
                dispatch(fillFormFromAI(structured_data));
            }
        } catch (err) {
            dispatch(
                addMessage({
                    role: 'ai',
                    content: 'Error processing your request. Please try again.',
                })
            );
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApplyToForm = (structured_data) => {
        dispatch(fillFormFromAI(structured_data));
    };

    return (
        <div className="ent-chat-panel">
            <div className="ent-chat-header">
                <div className="title-area">
                    <h2>✨ AI Assistant</h2>
                    <span className="subtitle">Log interaction via chat workflow</span>
                </div>
            </div>

            <div className="ent-chat-body">
                {messages.length === 0 && (
                    <div className="ent-chat-intro">
                        <div className="instruction-box">
                            <h4>Quick Action</h4>
                            <p>Type natural sentences to log an interaction directly.</p>
                            <div className="example">
                                "Met Dr. Smith today at 2 PM, discussed Product X efficacy..."
                            </div>
                        </div>
                    </div>
                )}

                <div className="ent-message-list">
                    {messages.map((msg, i) => (
                        <div key={i} className={`ent-msg-row ${msg.role}`}>
                            <div className={`ent-msg-bubble ${msg.role}`}>
                                <div
                                    className="msg-content"
                                    dangerouslySetInnerHTML={{
                                        __html: msg.content
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/_(.*?)_/g, '<em>$1</em>')
                                            .replace(/\n/g, '<br/>'),
                                    }}
                                />

                                {msg.role === 'ai' && msg.action === 'log_interaction' && msg.structured_data && (
                                    <button
                                        className="ent-apply-btn"
                                        onClick={() => handleApplyToForm(msg.structured_data)}
                                    >
                                        Apply to Form
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="ent-msg-row ai">
                            <div className="ent-msg-bubble ai typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            <div className="ent-chat-footer">
                <textarea
                    className="ent-chat-input"
                    placeholder="Message AI Assistant to log details..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={loading}
                />
                <button
                    className="ent-btn-primary chat-send"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    Send / Log
                </button>
            </div>
        </div>
    );
}
