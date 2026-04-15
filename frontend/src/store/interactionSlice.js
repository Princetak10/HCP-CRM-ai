import { createSlice } from '@reduxjs/toolkit';

const initialForm = {
    hcp_name: '',
    interaction_type: 'Meeting',
    date: '',
    time: '',
    attendees: '',
    notes: '', // Topics Discussed
    materials: [],
    samples: [],
    sentiment: 'Neutral',
    outcomes: '',
    followup: '',
};

const interactionSlice = createSlice({
    name: 'interaction',
    initialState: {
        form: { ...initialForm },
        interactions: [],
        loading: false,
        error: null,
        successMessage: null,
    },
    reducers: {
        setFormField(state, action) {
            const { field, value } = action.payload;
            state.form[field] = value;
        },
        fillFormFromAI(state, action) {
            const data = action.payload;
            if (data.hcp_name) state.form.hcp_name = data.hcp_name;
            if (data.interaction_type) state.form.interaction_type = data.interaction_type;

            // We parse datetime string if present into date and time separate fields
            if (data.datetime) {
                try {
                    const dt = new Date(data.datetime);
                    state.form.date = dt.toISOString().split('T')[0];
                    state.form.time = dt.toTimeString().slice(0, 5);
                } catch (e) { }
            }

            if (data.notes) state.form.notes = data.notes;
            if (data.followup) state.form.followup = data.followup;
            if (data.sentiment) state.form.sentiment = data.sentiment;
            if (data.outcomes) state.form.outcomes = data.outcomes;
            if (data.attendees) state.form.attendees = data.attendees;
        },
        resetForm(state) {
            state.form = { ...initialForm };
        },
        setInteractions(state, action) {
            state.interactions = action.payload;
        },
        setLoading(state, action) {
            state.loading = action.payload;
        },
        setError(state, action) {
            state.error = action.payload;
        },
        setSuccessMessage(state, action) {
            state.successMessage = action.payload;
        },
    },
});

export const {
    setFormField,
    fillFormFromAI,
    resetForm,
    setInteractions,
    setLoading,
    setError,
    setSuccessMessage,
} = interactionSlice.actions;

export default interactionSlice.reducer;
