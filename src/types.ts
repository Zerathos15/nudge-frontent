export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
}

export interface UserPreferences {
  study_style?: string;
  reminder_behavior?: string;
  preferred_language?: string;
  display_theme?: string;
  study_intensity?: string;
  response_preference?: string;
  personal_notes?: string;
  college_end_time?: string;
  saturday_is_working?: number;
}

export interface ActiveVersionInfo {
  id: string;
  version_number: string;
  title: string;
  created_at: string;
}

export interface ScheduledTask {
  id: string;
  user_id: string;
  topic_id: string;
  curriculum_version_id: string;
  scheduled_date: string;
  scheduled_slot_start: string;
  scheduled_slot_end: string;
  status:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'EVIDENCE_SUBMITTED'
    | 'STUDIED'
    | 'MASTERED'
    | 'FAILED_MASTERY'
    | 'DEFERRED'
    | 'RESCHEDULED'
    | 'BLOCKED';
  original_date: string;
  rescheduled_date?: string;
  completed_at?: string;
  topic_code: string;
  topic_title: string;
  topic_description?: string;
  task_type: 'THEORY' | 'PRACTICE' | 'PROJECT' | 'RESEARCH' | 'INTERVIEW' | 'REVISION';
  requires_mastery: number | boolean;
  estimated_minutes?: number;
  track_key: string;
  track_title: string;
  track_color: string;
  module_title: string;
  module_number: number;
}

export interface TrackCheckpoint {
  id: string;
  track_key: string;
  track_title: string;
  track_color: string;
  current_module_id?: string;
  current_topic_id?: string;
  completed_count: number;
  remaining_count: number;
  failed_count: number;
  mastery_state: string;
  updated_at: string;
  current_topic_info?: {
    code: string;
    title: string;
    task_type: string;
    requires_mastery: number;
    module_title: string;
  };
}

export interface EvidenceRecord {
  id: string;
  topic_id: string;
  topic_code: string;
  topic_title: string;
  task_type: string;
  track_key: string;
  track_title: string;
  track_color: string;
  module_title: string;
  original_filename: string;
  file_size: number;
  ai_status: 'PENDING' | 'VALID' | 'INSUFFICIENT' | 'INVALID';
  ai_analysis_json?: string;
  user_notes: string;
  created_at: string;
}

export interface ResearchMilestone {
  id: string;
  title: string;
  paper_or_experiment: string;
  stage:
    | 'LITERATURE_REVIEW'
    | 'RESEARCH_QUESTION'
    | 'BENCHMARK'
    | 'BASELINE'
    | 'EXPERIMENT'
    | 'ABLATION'
    | 'ANALYSIS'
    | 'PAPER_WRITING';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  notes?: string;
  created_at: string;
  updated_at: string;
}
