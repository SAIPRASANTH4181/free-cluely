import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are Wingman AI, a helpful assistant for any kind of problem or situation (not just coding). For any user input, provide direct, concise answers without unnecessary suggestions or options unless specifically asked.

IMPORTANT CODING GUIDELINES:
- For array indexing problems: Remember that arrays are 0-indexed. The 1st element is at index 0, 2nd at index 1, etc.
- When asked for the "nth element", return arr[n-1], not n itself.
- For example: "5th element" should return arr[4], not 5.
- Always provide the actual element value or correct array access, not the position number.
- If the problem involves coding, provide working code that correctly handles the specific requirements.
- For coding problems, provide COMPLETE solutions including:
  * Full function/class implementation with proper edge case handling
  * Input validation (null checks, type checks, bounds checking)
  * Error handling for invalid inputs
  * Clear code comments explaining the logic
  * Example usage with test cases
  * Time and space complexity analysis
  * Detailed explanation of how the code works

COMPREHENSIVE DSA & CODING GUIDELINES:
- Handle ANY type of coding problem: Arrays, Strings, Trees, Graphs, Dynamic Programming, System Design, etc.
- For complex algorithms, provide step-by-step implementation with clear logic
- Include multiple approaches when applicable (brute force, optimized, etc.)
- For system design questions, provide architecture diagrams and trade-offs
- For database problems, include SQL queries with proper indexing
- For concurrency problems, handle race conditions and synchronization
- Always consider edge cases, boundary conditions, and error scenarios
- Provide both iterative and recursive solutions when relevant
- Include optimization techniques (memoization, tabulation, etc.)
- Explain the algorithm's intuition and why it works`

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
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images. If it's a coding problem, be specific about requirements like array indexing.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

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
    const prompt = `${this.systemPrompt}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "Complete, production-ready code that handles ANY type of coding problem. Include comprehensive edge case handling, input validation, error handling, and clear comments. For complex algorithms, provide step-by-step implementation with multiple approaches when applicable.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context and problem analysis.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Detailed explanation of the solution approach, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}\n\nFor ANY coding problem (Arrays, Strings, Trees, Graphs, DP, System Design, etc.), ensure your code includes:\n- Complete implementation with proper edge case handling\n- Input validation and error handling\n- Clear comments explaining the algorithm logic\n- Example usage with test cases\n- Time and space complexity analysis\n- Multiple approaches when applicable (brute force, optimized)\n- Algorithm intuition and why it works\n- For system design: architecture diagrams and trade-offs\n- For complex algorithms: step-by-step breakdown\n\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    try {
      const result = await this.model.generateContent(prompt)
      console.log("[LLMHelper] Gemini LLM returned result.");
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "Complete, production-ready code that handles ANY type of coding problem. Include comprehensive edge case handling, input validation, error handling, and clear comments. For complex algorithms, provide step-by-step implementation with multiple approaches when applicable.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context and problem analysis.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Detailed explanation of the solution approach, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}\n\nFor ANY coding problem (Arrays, Strings, Trees, Graphs, DP, System Design, etc.), ensure your code includes:\n- Complete implementation with proper edge case handling\n- Input validation and error handling\n- Clear comments explaining the algorithm logic\n- Example usage with test cases\n- Time and space complexity analysis\n- Multiple approaches when applicable (brute force, optimized)\n- Algorithm intuition and why it works\n- For system design: architecture diagrams and trade-offs\n- For complex algorithms: step-by-step breakdown\n\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed debug LLM response:", parsed)
      return parsed
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
      const prompt = `${this.systemPrompt}\n\nListen to this audio clip and provide a direct, concise answer to whatever question or topic is being discussed. Be brief and to the point. Do not suggest actions or provide options unless specifically asked.`;
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
      const prompt = `${this.systemPrompt}\n\nListen to this audio clip and provide a direct, concise answer to whatever question or topic is being discussed. Be brief and to the point. Do not suggest actions or provide options unless specifically asked.`;
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
      const prompt = `${this.systemPrompt}\n\nDescribe the content of this image and provide a direct, concise answer to any question or problem shown. Be brief and to the point. Do not suggest actions or provide options unless specifically asked. If this is a coding problem (arrays, strings, trees, graphs, dynamic programming, system design, etc.), provide complete solutions with edge case handling, input validation, multiple approaches when applicable, and detailed explanations.`;
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