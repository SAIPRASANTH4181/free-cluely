"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
class LLMHelper {
    client;
    systemPrompt = `You are Wingman AI, a helpful assistant for any kind of problem or situation (not just coding). For any user input, provide direct, concise answers without unnecessary suggestions or options unless specifically asked.

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
- Explain the algorithm's intuition and why it works

BEHAVIORAL INTERVIEW GUIDELINES:
- For behavioral questions, use the STAR format:
  * SITUATION: Describe the specific situation or context
  * TASK: Explain your role and responsibilities
  * ACTION: Detail the specific actions you took
  * RESULT: Share the outcomes and what you learned
- Provide concrete examples with specific details
- Quantify results when possible (numbers, percentages, metrics)
- Show both technical skills and soft skills (leadership, teamwork, problem-solving)
- Demonstrate growth and learning from challenges`;
    constructor(apiKey) {
        this.client = new openai_1.default({
            apiKey: apiKey,
        });
    }
    async fileToBase64(imagePath) {
        const imageData = await fs_1.default.promises.readFile(imagePath);
        return imageData.toString("base64");
    }
    cleanJsonResponse(text) {
        // Remove markdown code block syntax if present
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        // Remove any leading/trailing whitespace
        text = text.trim();
        return text;
    }
    async extractProblemFromImages(imagePaths) {
        try {
            const imageContents = await Promise.all(imagePaths.map(async (path) => {
                const base64 = await this.fileToBase64(path);
                return {
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${base64}`
                    }
                };
            }));
            const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images. If it's a coding problem, be specific about requirements like array indexing.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            ...imageContents
                        ]
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1
            });
            const text = this.cleanJsonResponse(response.choices[0].message.content || "");
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error extracting problem from images:", error);
            throw error;
        }
    }
    async generateSolution(problemInfo) {
        const prompt = `${this.systemPrompt}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "Complete, production-ready code that handles ANY type of coding problem. Include comprehensive edge case handling, input validation, error handling, and clear comments. For complex algorithms, provide step-by-step implementation with multiple approaches when applicable.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context and problem analysis.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Detailed explanation of the solution approach, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}\n\nFor ANY coding problem (Arrays, Strings, Trees, Graphs, DP, System Design, etc.), ensure your code includes:\n- Complete implementation with proper edge case handling\n- Input validation and error handling\n- Clear comments explaining the algorithm logic\n- Example usage with test cases\n- Time and space complexity analysis\n- Multiple approaches when applicable (brute force, optimized)\n- Algorithm intuition and why it works\n- For system design: architecture diagrams and trade-offs\n- For complex algorithms: step-by-step breakdown\n\nFor behavioral questions, use STAR format with concrete examples and quantified results.\n\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.1
            });
            const text = this.cleanJsonResponse(response.choices[0].message.content || "");
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error generating solution:", error);
            throw error;
        }
    }
    async debugSolutionWithImages(problemInfo, currentCode, debugImagePaths) {
        try {
            const imageContents = await Promise.all(debugImagePaths.map(async (path) => {
                const base64 = await this.fileToBase64(path);
                return {
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${base64}`
                    }
                };
            }));
            const prompt = `${this.systemPrompt}\n\nI have a coding problem and a current solution. Please analyze the additional images and debug/improve the solution.\n\nProblem: ${JSON.stringify(problemInfo, null, 2)}\n\nCurrent Code:\n${currentCode}\n\nPlease provide your response in the following JSON format:\n{
  "debugged_solution": {
    "code": "Improved, production-ready code that handles ANY type of coding problem. Include comprehensive edge case handling, input validation, error handling, and clear comments. For complex algorithms, provide step-by-step implementation with multiple approaches when applicable.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context and problem analysis.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Detailed explanation of the solution approach, time/space complexity, algorithm intuition, and why this solution is optimal."
  }
}\n\nFor ANY coding problem (Arrays, Strings, Trees, Graphs, DP, System Design, etc.), ensure your code includes:\n- Complete implementation with proper edge case handling\n- Input validation and error handling\n- Clear comments explaining the algorithm logic\n- Example usage with test cases\n- Time and space complexity analysis\n- Multiple approaches when applicable (brute force, optimized)\n- Algorithm intuition and why it works\n- For system design: architecture diagrams and trade-offs\n- For complex algorithms: step-by-step breakdown\n\nFor behavioral questions, use STAR format with concrete examples and quantified results.\n\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            ...imageContents
                        ]
                    }
                ],
                max_tokens: 4000,
                temperature: 0.1
            });
            const text = this.cleanJsonResponse(response.choices[0].message.content || "");
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error debugging solution with images:", error);
            throw error;
        }
    }
    async analyzeAudioFile(audioPath) {
        try {
            const audioData = await fs_1.default.promises.readFile(audioPath);
            const base64 = audioData.toString("base64");
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please transcribe this audio and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format."
                            },
                            {
                                type: "input_audio",
                                input_audio: {
                                    data: base64,
                                    format: "mp3"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            });
            return {
                text: response.choices[0].message.content || ""
            };
        }
        catch (error) {
            console.error("Error analyzing audio file:", error);
            throw error;
        }
    }
    async analyzeAudioFromBase64(data, mimeType) {
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please transcribe this audio and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format."
                            },
                            {
                                type: "input_audio",
                                input_audio: {
                                    data: data,
                                    format: mimeType.includes("mp3") ? "mp3" : "wav"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            });
            return {
                text: response.choices[0].message.content || ""
            };
        }
        catch (error) {
            console.error("Error analyzing audio from base64:", error);
            throw error;
        }
    }
    async analyzeImageFile(imagePath) {
        try {
            const base64 = await this.fileToBase64(imagePath);
            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please analyze this image and extract the problem statement or question. If it's a coding problem, be specific about requirements like array indexing. If it's a behavioral question, note that it should be answered in STAR format."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${base64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            });
            return {
                text: response.choices[0].message.content || ""
            };
        }
        catch (error) {
            console.error("Error analyzing image file:", error);
            throw error;
        }
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=LLMHelper.js.map