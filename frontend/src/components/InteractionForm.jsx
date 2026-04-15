import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    setFormField,
    resetForm,
    setLoading,
    setError,
    setSuccessMessage,
} from '../store/interactionSlice';
import { logInteraction, sendChat } from '../api/interactionApi';

const INTERACTION_TYPES = ['Meeting', 'Call', 'Email', 'Conference'];
const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];

export default function InteractionForm() {
    const dispatch = useDispatch();
    const { form, loading, successMessage, error } = useSelector((s) => s.interaction);
    const [validationErrors, setValidationErrors] = useState({});
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const handleChange = (field, value) => {
        dispatch(setFormField({ field, value }));
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.hcp_name.trim()) errs.hcp_name = 'Required';
        if (!form.date) errs.date = 'Required';
        if (!form.time) errs.time = 'Required';
        return errs;
    };

    const toggleVoice = () => {
        if (isListening) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            // Append voice text to whatever is currently in the notes box
            handleChange('notes', form.notes ? form.notes + " " + text : text);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) { }
    };

    const handleGenerateSuggestions = async () => {
        if (!form.hcp_name.trim()) {
            alert('Please enter an HCP Name so the AI can retrieve historical context for follow-ups.');
            return;
        }
        setLoadingSuggestions(true);
        try {
            const res = await sendChat(`Suggest what I should do next with ${form.hcp_name}.`);
            // Split LLM output into individual action list
            const text = res.data.reply;
            const bullets = text
                .split('\n')
                .filter(l => l.trim().length > 5)
                .map(l => l.replace(/^[\d\.\-\*\_]+/g, '').trim());
            setAiSuggestions(bullets);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setValidationErrors(errs);
            return;
        }
        dispatch(setLoading(true));
        dispatch(setError(null));

        // Map to backend schema which expects a single datetime
        const datetimeStr = `${form.date}T${form.time}:00`;

        const payload = {
            hcp_name: form.hcp_name,
            interaction_type: form.interaction_type,
            datetime: datetimeStr,
            notes: `Attendees: ${form.attendees}\n\nNotes: ${form.notes}\n\nOutcomes: ${form.outcomes}`,
            followup: form.followup,
            sentiment: form.sentiment,
        };

        try {
            await logInteraction(payload);
            dispatch(setSuccessMessage('Interaction logged successfully!'));
            dispatch(resetForm());
            setValidationErrors({});
            setTimeout(() => dispatch(setSuccessMessage(null)), 4000);
        } catch (err) {
            dispatch(setError(err?.response?.data?.detail || 'Failed to log interaction'));
        } finally {
            dispatch(setLoading(false));
        }
    };

    return (
        <form className="ent-form-panel" onSubmit={handleSubmit}>
            <div className="ent-form-header">
                <h2>Log Interaction</h2>
                {loading && <div className="ent-badge info">Saving...</div>}
                {successMessage && <div className="ent-badge success">{successMessage}</div>}
                {error && <div className="ent-badge error">Error saving</div>}
            </div>

            <div className="ent-form-body">

                {/* Section 1: Interaction Details */}
                <div className="ent-section">
                    <h3 className="ent-section-title">Interaction Details</h3>

                    <div className="ent-row">
                        <div className="ent-field flex-2">
                            <label>HCP Name <span className="req">*</span></label>
                            <input
                                type="text"
                                className={`ent-input ${validationErrors.hcp_name ? 'err' : ''}`}
                                placeholder="Search or enter HCP name"
                                value={form.hcp_name}
                                onChange={(e) => handleChange('hcp_name', e.target.value)}
                            />
                        </div>
                        <div className="ent-field flex-1">
                            <label>Interaction Type</label>
                            <select
                                className="ent-input"
                                value={form.interaction_type}
                                onChange={(e) => handleChange('interaction_type', e.target.value)}
                            >
                                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="ent-row">
                        <div className="ent-field flex-1">
                            <label>Date <span className="req">*</span></label>
                            <input
                                type="date"
                                className={`ent-input ${validationErrors.date ? 'err' : ''}`}
                                value={form.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                            />
                        </div>
                        <div className="ent-field flex-1">
                            <label>Time <span className="req">*</span></label>
                            <input
                                type="time"
                                className={`ent-input ${validationErrors.time ? 'err' : ''}`}
                                value={form.time}
                                onChange={(e) => handleChange('time', e.target.value)}
                            />
                        </div>
                        <div className="ent-field flex-2">
                            <label>Attendees</label>
                            <input
                                type="text"
                                className="ent-input"
                                placeholder="e.g. Dr. Roberts, Nurse Jane"
                                value={form.attendees}
                                onChange={(e) => handleChange('attendees', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="ent-field" style={{ marginTop: '12px' }}>
                        <label className="ent-label-with-icon">
                            Topics Discussed
                            <button
                                type="button"
                                className="ent-icon-btn microphone"
                                title={isListening ? "Listening... Click to stop" : "Voice Input"}
                                onClick={toggleVoice}
                                style={{ color: isListening ? '#dc2626' : 'inherit' }}
                            >
                                {isListening ? (
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Recording...</span>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                )}
                            </button>
                        </label>
                        <textarea
                            className="ent-input ent-textarea"
                            rows="4"
                            placeholder="Detailed notes on topics discussed..."
                            value={form.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                        ></textarea>
                        <button type="button" className="ent-btn-secondary voice-btn mt-xs">
                            Summarize from Voice Note (Requires Consent)
                        </button>
                    </div>
                </div>

                {/* Section 2: Materials / Samples */}
                <div className="ent-section">
                    <h3 className="ent-section-title">Materials &amp; Samples</h3>
                    <div className="ent-row">
                        <div className="ent-box">
                            <div className="ent-box-header">
                                <h4>Materials Shared</h4>
                                <button type="button" className="ent-link-btn">Search/Add</button>
                            </div>
                            <div className="ent-empty-state">No materials added resulting from interaction</div>
                        </div>
                        <div className="ent-box">
                            <div className="ent-box-header">
                                <h4>Samples Distributed</h4>
                                <button type="button" className="ent-link-btn">Add Sample</button>
                            </div>
                            <div className="ent-empty-state">No samples recorded for this interaction</div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Sentiment */}
                <div className="ent-section">
                    <h3 className="ent-section-title">Observational Sentiment</h3>
                    <div className="ent-field">
                        <label>Observed / Inferred HCP Sentiment</label>
                        <div className="ent-radio-group">
                            {SENTIMENTS.map(s => (
                                <label key={s} className="ent-radio">
                                    <input
                                        type="radio"
                                        name="sentiment"
                                        value={s}
                                        checked={form.sentiment === s}
                                        onChange={(e) => handleChange('sentiment', e.target.value)}
                                    />
                                    <span>{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section 4: Outcomes & Follow-up */}
                <div className="ent-section">
                    <h3 className="ent-section-title">Outcomes &amp; Follow-up</h3>
                    <div className="ent-field">
                        <label>Key Outcomes</label>
                        <textarea
                            className="ent-input ent-textarea"
                            rows="2"
                            placeholder="What were the agreements or outcomes?"
                            value={form.outcomes}
                            onChange={(e) => handleChange('outcomes', e.target.value)}
                        ></textarea>
                    </div>

                    <div className="ent-row" style={{ marginTop: '12px' }}>
                        <div className="ent-field flex-2">
                            <label>Follow-up Actions</label>
                            <textarea
                                className="ent-input ent-textarea"
                                rows="3"
                                placeholder="List follow-up items..."
                                value={form.followup}
                                onChange={(e) => handleChange('followup', e.target.value)}
                            ></textarea>
                        </div>
                        <div className="ent-field flex-1 ai-suggestions">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                ✨ AI Suggested Follow-ups
                                <button type="button" onClick={handleGenerateSuggestions} disabled={loadingSuggestions} className="ent-link-btn" style={{ fontSize: '11px' }}>
                                    {loadingSuggestions ? 'Generating...' : 'Regenerate'}
                                </button>
                            </label>
                            <ul className="ent-list">
                                {aiSuggestions.length > 0 ? (
                                    aiSuggestions.map((s, idx) => (
                                        <li key={idx}>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('followup', form.followup ? form.followup.trim() + "\n• " + s : "• " + s)}
                                                style={{ textAlign: 'left' }}
                                            >
                                                {s}
                                            </button>
                                        </li>
                                    ))
                                ) : (
                                    <>
                                        <li><button type="button" onClick={() => handleChange('followup', form.followup ? form.followup + '\nSchedule follow-up meeting' : 'Schedule follow-up meeting')}>Schedule follow-up meeting</button></li>
                                        <li><button type="button" onClick={() => handleChange('followup', form.followup ? form.followup + '\nSend product PDF' : 'Send product PDF')}>Send product PDF</button></li>
                                        <li><button type="button" onClick={handleGenerateSuggestions} style={{ fontStyle: 'italic', color: '#64748b' }}>Generate contextual suggestions...</button></li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>

            <div className="ent-form-footer">
                <button type="button" className="ent-btn-ghost">Cancel</button>
                <button type="submit" className="ent-btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Interaction'}
                </button>
            </div>
        </form>
    );
}
