export type Task = {
  id: string
  title: string
  category: string
  completed: boolean
}

export type PollOption = {
  id: string
  text: string
  votes: number
}

export type Poll = {
  id: string
  question: string
  options: PollOption[]
  userVote?: string
}

export type Cost = {
  name: string
  total: number
  splitCount: number
}
