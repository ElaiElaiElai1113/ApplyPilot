'use server'

export interface GenerateApplicationResponse {
  proposal_message: string
  tailored_resume: string
  match_score: number
  missing_keywords: string[]
  interview_questions: string[]
}

export interface GenerateApplicationInput {
  company: string
  role: string
  jobDescription: string
  resumeContent: string
}

export async function generateApplication(
  input: GenerateApplicationInput
): Promise<GenerateApplicationResponse> {
  const { company, role, jobDescription, resumeContent } = input

  const prompt = `You are an expert job application assistant. Analyze the following resume and job description to create a tailored application package.

Resume:
${resumeContent}

Job Details:
- Company: ${company}
- Role: ${role}
- Job Description: ${jobDescription}

Please provide a JSON response with the following structure:
{
  "proposal_message": "A compelling cover letter/proposal message (3-4 paragraphs)",
  "tailored_resume": "An optimized version of the resume tailored for this specific role, highlighting relevant experience and skills",
  "match_score": "A number between 0-100 indicating how well the resume matches the job requirements",
  "missing_keywords": "Array of important keywords from the job description that are missing or underemphasized in the resume",
  "interview_questions": "Array of 5-8 likely interview questions based on the job requirements and resume"
}

Important guidelines:
- The proposal should be professional, enthusiastic, and demonstrate understanding of the company and role
- The tailored resume should maintain the original structure but optimize bullet points and descriptions
- The match score should be realistic and based on actual skill alignment
- Missing keywords should be specific and actionable
- Interview questions should be relevant and challenging
- Return ONLY valid JSON, no additional text`

  try {
    const response = await fetch(process.env.GLM_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        messages: [
          {
            role: 'system',
            content: 'You are a professional job application assistant that always responds with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('GLM API Error:', error)
      throw new Error('Failed to generate application')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    // Parse the JSON response
    let jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    }

    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response')
    }

    const jsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[0])

    return {
      proposal_message: jsonResponse.proposal_message || '',
      tailored_resume: jsonResponse.tailored_resume || '',
      match_score: jsonResponse.match_score || 0,
      missing_keywords: jsonResponse.missing_keywords || [],
      interview_questions: jsonResponse.interview_questions || [],
    }
  } catch (error) {
    console.error('Generation error:', error)
    throw new Error('Failed to generate application')
  }
}
