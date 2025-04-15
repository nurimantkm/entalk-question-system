const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Replace with your actual MongoDB connection URI
const MONGO_URI = 'mongodb+srv://EntalkAdmin:Pamyk3gara@entalk-cluster.hc0qztn.mongodb.net/?retryWrites=true&w=majority&appName=entalk-cluster'; 

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    addQuestion();
  })
  .catch(err => console.error('Could not connect to MongoDB:', err));

const questionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  text: String,
  eventId: String,
  category: String,
  deckPhase: String,
  createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model('Question', questionSchema);

async function addQuestion() {
  // Replace with your desired question data
  const newQuestionData = {
    text: 'What\'s your favorite hobby?',
    eventId: '024eb0eb-d4f2-40c5-9631-72c1a4fdab6f', // Replace with a valid event ID
    category: 'Hobbies & Interests',
    deckPhase: 'Warm-up'
  };

  const newQuestion = new Question(newQuestionData);

  try {
    const savedQuestion = await newQuestion.save();
    console.log('Question added:', savedQuestion);
  } catch (err) {
    console.error('Error adding question:', err);
  } finally {
    mongoose.connection.close();
  }
}
