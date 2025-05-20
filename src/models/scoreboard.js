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

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .order('id', { ascending: true });

    if (teams && teams.length > 0) {
      this.data.teams = teams;
    }

    return this.data;
  }

  async updateGameSettings(settings) {
    try {
      if (settings.round !== undefined) {
        this.data.round = parseInt(settings.round);
      }

      if (settings.mode !== undefined) {
        this.data.mode = parseInt(settings.mode);
      }

      return this.data;
    } catch (error) {
      console.error('Error updating game settings:', error);
      throw error;
    }
  }
  
  async getData() {
    try {
      return this.data;
    } catch (error) {
      console.error('Error getting scoreboard data:', error);
      throw error;
    }
  }

  async getTeamName(teamId) {
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (error) {
        throw error;
      }

      return team.name;
    } catch (error) {
      console.error('Error getting team name:', error);
      throw error;
    }
  } 
}

// Create and initialize the singleton instance
const scoreboardModelInstance = new ScoreboardModel();

// Export as singleton
export default scoreboardModelInstance;