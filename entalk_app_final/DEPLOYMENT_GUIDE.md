# Entalk Question System - Deployment and Usage Guide

## Overview

The Entalk Question System has been successfully implemented on top of your existing application. This system provides:

1. A question bank with categorized questions
2. Swipe-based feedback collection
3. Question ranking based on user feedback
4. Location-specific question selection
5. AI-generated questions when needed
6. QR code access for participants

## Deployment Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB database (or the in-memory database for testing)
- OpenAI API key for AI question generation

### Environment Setup

1. Create a `.env` file in the root directory with the following variables:

```
PORT=3000
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
node server.js
```

## Usage Guide

### Admin/Organizer Flow

1. **Login/Register**: Access the application at `/login.html` or `/register.html`

2. **Create an Event**: 
   - Go to `/events.html`
   - Fill in event details including name, description, date, and location
   - Click "Create Event"

3. **Generate Questions**:
   - Select your event from the list
   - Choose a topic, category, and deck phase
   - Click "Generate Questions"
   - Review the generated questions and click "Save Questions"

4. **Create Question Deck**:
   - Select a location from the dropdown
   - Click "Generate Deck"
   - The system will automatically select 15 questions based on:
     - Questions not used at this location in the last 4 weeks
     - Question performance (likes/dislikes)
     - Category and phase coverage
     - Including some novelty questions

5. **Share with Participants**:
   - Click "Show QR Code" for the generated deck
   - Share the QR code with participants or use the direct link

### Participant Flow

1. **Access Questions**:
   - Scan the QR code or use the provided link
   - This opens the participant interface at `/participant.html?code=ACCESS_CODE`

2. **Answer Questions**:
   - Swipe right to like a question
   - Swipe left to dislike a question
   - Alternatively, use the like/dislike buttons
   - Progress through all 15 questions

3. **Completion**:
   - After answering all questions, a thank you message is displayed

## System Components

### Backend

- **Models**: Enhanced data models for questions, feedback, locations, and decks
- **Question Service**: Core logic for question management and selection
- **OpenAI Integration**: AI-based question generation

### Frontend

- **Participant Interface**: Mobile-friendly swipe interface
- **Admin Dashboard**: Event and question management
- **QR Code System**: Easy access for participants

## Maintenance and Updates

### Adding New Questions

You can add new questions in three ways:

1. **Manual Entry**: Enter questions directly in the textarea
2. **AI Generation**: Use the "Generate Questions" feature
3. **Bulk Import**: Coming in a future update

### Monitoring Question Performance

The system automatically tracks:
- View count
- Like/dislike ratio
- Overall question score

This data is used to improve question selection over time.

## Troubleshooting

### Common Issues

1. **QR Code Not Working**: Ensure the server is running and accessible
2. **No Questions Available**: Generate more questions or check event/location settings
3. **OpenAI Integration Issues**: Verify your API key is correct and has sufficient credits

## Future Enhancements

Potential future improvements:
- Advanced analytics dashboard
- User demographic tracking
- Multi-language support
- Custom question categories
- Participant profiles and history
