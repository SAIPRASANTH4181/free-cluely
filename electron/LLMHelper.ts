import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"

export class LLMHelper {
  private model: GenerativeModel
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

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    text = text.trim();
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}

Analyze these images and extract the problem in JSON format:
{
  "problem_statement": "Clear statement of the problem. For coding problems, be specific about requirements like array indexing.",
  "context": "Relevant background from images.",
  "suggested_responses": ["First answer", "Second answer"],
  "reasoning": "Why these suggestions are appropriate."
}

Return ONLY the JSON object, no markdown formatting.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
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
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      console.error("Error generating solution:", error)
      throw error
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
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

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      console.error("Error debugging solution with images:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      const prompt = `${this.systemPrompt}

Listen to this audio and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format.

Provide a direct, concise transcription of what was said.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      const prompt = `${this.systemPrompt}

Listen to this audio and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format.

Provide a direct, concise transcription of what was said.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      const prompt = `${this.systemPrompt}

Analyze this image and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format.

Provide a direct, concise description of what you see and any questions or problems depicted.`;
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }
} 