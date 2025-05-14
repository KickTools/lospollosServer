// src/models/scoreboard.js
import { supabase } from './supabase.js';

class ScoreboardModel {
  constructor() {
    // Initial scoreboard data (will be loaded from Supabase)
    this.data = {
      contestants: [],
      round: 1,
      mode: 2 // Default to 2 contestants
    };

    this.currentQuestion = null;
  }

  async initialize() {
    // Load game settings
    const { data: settings } = await supabase
      .from('game_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (settings && settings.length > 0) {
      this.data.round = settings[0].current_round;
      this.data.mode = settings[0].mode;
    } else {
      // Create default settings if none exist
      await supabase.from('game_settings').insert([
        { mode: this.data.mode, current_round: this.data.round }
      ]);
    }

    // Load contestants
    const { data: contestants } = await supabase
      .from('contestants')
      .select('*')
      .order('id', { ascending: true });

    if (contestants && contestants.length > 0) {
      this.data.contestants = contestants;
    } else {
      // Create default contestants if none exist
      const defaultContestants = [
        { name: 'Newlyweds 1', score: 0 },
        { name: 'Newlyweds 2', score: 0 },
        { name: 'Newlyweds 3', score: 0 }
      ];

      const { data } = await supabase
        .from('contestants')
        .insert(defaultContestants)
        .select();

      this.data.contestants = data || [];
    }

    return this.data;
  }

  async getData() {
    return this.data;
  }

  getContestants() {
    // Return contestants based on mode
    return this.data.mode === 2
      ? this.data.contestants.slice(0, 2)
      : this.data.contestants;
  }

  async updateScoreboard(data) {
    // Log incoming data for debugging
    console.log('Updating scoreboard with data:', JSON.stringify(data));

    // Update settings in the database
    await supabase
      .from('game_settings')
      .upsert([
        {
          id: 1, // Assuming we only have one settings record
          mode: data.mode,
          current_round: data.round,
          updated_at: new Date()
        }
      ]);

    // Update contestants in the database
    for (const contestant of data.contestants) {
      console.log('Updating contestant:', contestant);

      // Ensure we have all required fields for the update
      const updateData = {
        id: contestant.id,
        name: contestant.name || `Contestant ${contestant.id + 1}`,
        score: contestant.score || 0
      };

      await supabase
        .from('contestants')
        .upsert(updateData);
    }

    this.data = data;
    return {
      contestants: this.getContestants(),
      round: this.data.round,
      mode: this.data.mode
    };
  }

  async updateScore(id, score) {
    if (this.data.contestants[id]) {
      this.data.contestants[id].score = score;

      // Update score in the database
      await supabase
        .from('contestants')
        .update({ score })
        .eq('id', id);

      return {
        id,
        score
      };
    }
    return null;
  }

  async getCurrentQuestion() {
    if (!this.currentQuestion) {
      // Try to load the most recent question
      const { data } = await supabase
        .from('questions')
        .select(`
          *,
          answers(*)
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        this.currentQuestion = {
          id: data.id,
          text: data.question_text,
          answers: data.answers.map(a => ({
            id: a.id,
            text: a.answer_text,
            isCorrect: a.is_correct
          }))
        };
      }
    }

    return this.currentQuestion;
  }

  async updateQuestion(question) {
    // Store question in Supabase
    const { data: questionData } = await supabase
      .from('questions')
      .insert([
        {
          question_text: question.text,
          round_id: this.data.round
        }
      ])
      .select()
      .single();

    if (questionData && question.answers) {
      // Store answers
      const answersToInsert = question.answers.map(answer => ({
        question_id: questionData.id,
        answer_text: answer.text,
        is_correct: answer.isCorrect || false
      }));

      await supabase.from('answers').insert(answersToInsert);
    }

    this.currentQuestion = question;
    return question;
  }

  async createContestant(name) {
    const { data } = await supabase
      .from('contestants')
      .insert([{ name, score: 0 }])
      .select();

    if (data && data.length > 0) {
      this.data.contestants.push(data[0]);
      return data[0];
    }

    return null;
  }

  async deleteContestant(id) {
    await supabase
      .from('contestants')
      .delete()
      .eq('id', id);

    this.data.contestants = this.data.contestants.filter(c => c.id !== id);
    return this.data.contestants;
  }
}

// Create and initialize the singleton instance
const scoreboardModelInstance = new ScoreboardModel();

// Export as singleton
export default scoreboardModelInstance;