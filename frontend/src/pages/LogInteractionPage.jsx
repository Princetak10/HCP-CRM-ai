import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import InteractionForm from '../components/InteractionForm';
import ChatPanel from '../components/ChatPanel';
import { setInteractions } from '../store/interactionSlice';
import { getInteractions } from '../api/interactionApi';

export default function LogInteractionPage() {
    const dispatch = useDispatch();

    useEffect(() => {
        getInteractions()
            .then((res) => dispatch(setInteractions(res.data)))
            .catch(() => { });
    }, [dispatch]);

    return (
        <div className="app-shell">
            {/* Top Nav */}
            <header className="app-nav">
                <div className="nav-logo">
                    <span className="logo-icon">💊</span>
                    <span className="logo-text">HCP <span className="logo-accent">CRM</span></span>
                </div>
                <div className="nav-badge">AI-Powered</div>
            </header>



            {/* Split Layout */}
            <main className="split-layout">
                <section className="left-pane">
                    <InteractionForm />
                </section>
                <section className="right-pane">
                    <ChatPanel />
                </section>
            </main>
        </div>
    );
}
