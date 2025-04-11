# README - Entalk Question System

## Introduction

This is the enhanced Entalk Question System built on top of the existing application. The system provides a complete solution for managing conversation questions for English-speaking social events, including:

1. Question categorization and organization
2. Swipe-based feedback collection
3. Question ranking based on user feedback
4. Location-specific question selection
5. AI-generated questions when needed
6. QR code access for participants

## Quick Start

1. Create a `.env` file based on the `.env.example` template
2. Add your OpenAI API key to the `.env` file
3. Install dependencies: `npm install`
4. Start the server: `node server.js`
5. Access the application at `http://localhost:3000`

## Features

### For Organizers
- Create events for different locations
- Generate and manage question banks
- Create question decks for specific events
- Share QR codes with participants

### For Participants
- Access questions via QR code or direct link
- Swipe to provide feedback on questions
- Simple, mobile-friendly interface

## Documentation

For detailed instructions, please refer to the `DEPLOYMENT_GUIDE.md` file included in this package.

## Testing

Run the test suite to verify functionality:
```
npm test
```

## OpenAI Integration

The system uses OpenAI to generate new questions when:
- Not enough questions are available for a location
- Specific categories need to be filled
- Novelty questions are needed

Make sure to provide your OpenAI API key in the `.env` file to enable this functionality.

## Support

For any issues or questions, please refer to the troubleshooting section in the deployment guide.
