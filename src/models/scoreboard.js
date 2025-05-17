// src/models/scoreboard.js
import { supabase } from './supabase.js';

class ScoreboardModel {
  constructor() {
    // Initial scoreboard data (will be loaded from Supabase)
    this.data = {
      contestants: [],
      round: 1,
      mode: 3 // Default to 2 contestants
    };

    this.currentQuestion = null;
  }

  async initialize() {
    console.log("Initializing scoreboard data from Supabase...");
    
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
    console.log("Game settings initialized:", this.data);

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .order('id', { ascending: true });

    if (teams && teams.length > 0) {
      this.data.teams = teams;
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

  async saveQueuedQuestion(questionData) {
    // Store question in Supabase
    const { data: savedQuestion } = await supabase
      .from('queued_questions')
      .insert([
        {
          question_text: questionData.text,
          team_id: questionData.team,
          round_id: this.data.round,
          is_used: false
        }
      ])
      .select()
      .single();

    if (savedQuestion && questionData.answers) {
      // Store answers
      const answersToInsert = questionData.answers.map(answer => ({
        question_id: savedQuestion.id,
        answer_text: answer.text,
        is_correct: answer.isCorrect || false
      }));

      await supabase.from('queued_answers').insert(answersToInsert);
    }

    return savedQuestion;
  }

  async getQueuedQuestions() {
    // Fetch all questions that have not been used yet
    const { data: questions } = await supabase
      .from('queued_questions')
      .select(`
        *,
        queued_answers(*)
      `)
      .order('created_at', { ascending: true });

    if (!questions) return [];

    // Format the questions to match the expected structure
    return questions.map(q => ({
      id: q.id,
      text: q.question_text,
      team: q.team_id,
      answers: q.queued_answers.map(a => ({
        id: a.id,
        text: a.answer_text,
        isCorrect: a.is_correct
      }))
    }));
  }

  async deleteQueuedQuestion(id) {
    // Delete the answers first to maintain referential integrity
    await supabase
      .from('queued_answers')
      .delete()
      .eq('question_id', id);

    // Then delete the question
    await supabase
      .from('queued_questions')
      .delete()
      .eq('id', id);

    return { success: true };
  }

  async clearQueuedQuestions() {
    // Get all unused question IDs
    const { data: questions } = await supabase
      .from('queued_questions')
      .select('id')
      .eq('is_used', false);

    if (questions && questions.length > 0) {
      // Delete all answers for those questions
      const questionIds = questions.map(q => q.id);

      await supabase
        .from('queued_answers')
        .delete()
        .in('question_id', questionIds);

      // Then delete the questions
      await supabase
        .from('queued_questions')
        .delete()
        .in('id', questionIds);
    }

    return { success: true };
  }

  async markQuestionAsUsed(id) {
    // Mark the question as used
    await supabase
      .from('queued_questions')
      .update({ is_used: true })
      .eq('id', id);

    return { success: true };
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