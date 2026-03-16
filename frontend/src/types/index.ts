export interface ResumeProfile {
  name: string
  email: string
  phone: string
  title: string
  yearsOfExperience: number
  skills: string[]
  languages: string[]
  workHistory: WorkExperience[]
  education: Education[]
}

export interface WorkExperience {
  company: string
  role: string
  duration: string
}

export interface Education {
  institution: string
  degree: string
  year: string
}

export interface JobMatch {
  title: string
  company: string
  location: string
  salary: string
  url: string
  matchScore: number
  matchedSkills: string[]
  description: string
}

export interface AnalyseResponse {
  profile: ResumeProfile
  jobMatches: JobMatch[]
  missingSkills: string[]
  atsImprovements: string[]
  atsScore: number
  summary: string
}