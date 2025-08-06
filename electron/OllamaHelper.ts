import fs from "fs"

export class OllamaHelper {
  private readonly baseUrl: string
  private readonly model: string
  private readonly systemPrompt = `You are Wingman AI, an expert coding interview assistant. You provide COMPLETE, PRODUCTION-READY solutions for any coding problem.

CRITICAL CODING REQUIREMENTS:
- For array indexing: Arrays are 0-indexed. "5th element" = arr[4], not 5
- ALWAYS provide COMPLETE code with:
  * Full function/class implementation
  * Input validation and error handling
  * Edge case handling
  * Clear comments explaining logic
  * Example usage with test cases
  * Time and space complexity analysis
  * Detailed explanation of algorithm

DSA & CODING GUIDELINES:
- Handle ANY problem: Arrays, Strings, Trees, Graphs, DP, System Design
- Provide multiple approaches when relevant (brute force, optimized)
- Include step-by-step algorithm breakdown
- Explain intuition and why the solution works
- For system design: architecture diagrams and trade-offs
- For complex algorithms: iterative and recursive solutions
- Always consider edge cases and boundary conditions

BEHAVIORAL INTERVIEW GUIDELINES:
- Use STAR format: SITUATION, TASK, ACTION, RESULT
- Provide concrete examples with specific details
- Quantify results (numbers, percentages, metrics)
- Show technical skills and soft skills
- Demonstrate growth and learning

RESPONSE FORMAT:
For coding problems, ALWAYS provide:
1. Complete working code
2. Input validation
3. Error handling
4. Test cases
5. Complexity analysis
6. Detailed explanation

For behavioral questions, ALWAYS use STAR format with specific examples.`

  constructor(model: string = "codellama:7b", baseUrl: string = "http://localhost:11434") {
    this.model = model
    this.baseUrl = baseUrl
  }

  private async makeRequest(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    text = text.trim();
    return text;
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `${this.systemPrompt}

Given this problem: ${JSON.stringify(problemInfo, null, 2)}

Provide a COMPLETE solution in JSON format:
{
  "solution": {
    "code": "COMPLETE, PRODUCTION-READY CODE with input validation, error handling, edge cases, clear comments, example usage, and test cases. For complex algorithms, include step-by-step implementation with multiple approaches.",
    "problem_statement": "Restate the problem.",
    "context": "Problem analysis and background.",
    "suggested_responses": ["First approach", "Second approach"],
    "reasoning": "Detailed explanation of solution approach, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}

CRITICAL: For ANY coding problem, ensure your code includes:
- Complete implementation with proper edge case handling
- Input validation and error handling
- Clear comments explaining the algorithm logic
- Example usage with test cases
- Time and space complexity analysis
- Multiple approaches when applicable
- Algorithm intuition and why it works

For behavioral questions, use STAR format with concrete examples and quantified results.

Return ONLY the JSON object, no markdown formatting.`

    try {
      const response = await this.makeRequest('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 4000
        }
      })

      const text = this.cleanJsonResponse(response.response)
      return JSON.parse(text)
    } catch (error) {
      console.error("Error generating solution with Ollama:", error)
      throw error
    }
  }

  public async analyzeText(text: string) {
    const prompt = `${this.systemPrompt}

Analyze this text and extract the problem statement or question: "${text}"

If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format.

Provide a direct, concise analysis.`

    try {
      const response = await this.makeRequest('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 1000
        }
      })

      return {
        text: response.response,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error("Error analyzing text with Ollama:", error)
      throw error
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath)
      const base64 = imageData.toString("base64")

      const prompt = `${this.systemPrompt}

Analyze this image and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format.

Provide a direct, concise description of what you see and any questions or problems depicted.`

      const response = await this.makeRequest('/api/generate', {
        model: this.model,
        prompt: prompt,
        images: [base64],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 1000
        }
      })

      return {
        text: response.response,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error("Error analyzing image with Ollama:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    // Note: Most Ollama models don't support audio directly
    // This would require a separate speech-to-text service
    throw new Error("Audio analysis not supported in Ollama. Use a separate STT service.")
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    // Note: Most Ollama models don't support audio directly
    // This would require a separate speech-to-text service
    throw new Error("Audio analysis not supported in Ollama. Use a separate STT service.")
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageDataPromises = imagePaths.map(async (path) => {
        const imageData = await fs.promises.readFile(path)
        return imageData.toString("base64")
      })
      
      const images = await Promise.all(imageDataPromises)
      
      const prompt = `${this.systemPrompt}

Analyze these images and extract the problem in JSON format:
{
  "problem_statement": "Clear statement of the problem. For coding problems, be specific about requirements like array indexing.",
  "context": "Relevant background from images.",
  "suggested_responses": ["First answer", "Second answer"],
  "reasoning": "Why these suggestions are appropriate."
}

Return ONLY the JSON object, no markdown formatting.`

      const response = await this.makeRequest('/api/generate', {
        model: this.model,
        prompt: prompt,
        images: images,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 2000
        }
      })

      const text = this.cleanJsonResponse(response.response)
      return JSON.parse(text)
    } catch (error) {
      console.error("Error extracting problem from images with Ollama:", error)
      throw error
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageDataPromises = debugImagePaths.map(async (path) => {
        const imageData = await fs.promises.readFile(path)
        return imageData.toString("base64")
      })
      
      const images = await Promise.all(imageDataPromises)
      
      const prompt = `${this.systemPrompt}

I have a coding problem and current solution. Analyze the debug images and improve the solution.

Problem: ${JSON.stringify(problemInfo, null, 2)}
Current Code: ${currentCode}

Provide improved solution in JSON format:
{
  "debugged_solution": {
    "code": "IMPROVED, PRODUCTION-READY CODE with input validation, error handling, edge cases, clear comments, example usage, and test cases.",
    "problem_statement": "Restate the problem.",
    "context": "Problem analysis and background.",
    "suggested_responses": ["First approach", "Second approach"],
    "reasoning": "Detailed explanation of improvements, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}

CRITICAL: Ensure your code includes complete implementation with proper edge case handling, input validation, error handling, clear comments, example usage, test cases, and complexity analysis.

Return ONLY the JSON object, no markdown formatting.`

      const response = await this.makeRequest('/api/generate', {
        model: this.model,
        prompt: prompt,
        images: images,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 4000
        }
      })

      const text = this.cleanJsonResponse(response.response)
      return JSON.parse(text)
    } catch (error) {
      console.error("Error debugging solution with Ollama:", error)
      throw error
    }
  }

  // Check if Ollama is running
  public async isRunning(): Promise<boolean> {
    try {
      await this.makeRequest('/api/tags', {})
      return true
    } catch (error) {
      return false
    }
  }

  // List available models
  public async listModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/api/tags', {})
      return response.models.map((model: any) => model.name)
    } catch (error) {
      console.error("Error listing models:", error)
      return []
    }
  }
} 