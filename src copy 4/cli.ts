import readline from "readline";

/**
 * Utility wrapper around Node's readline interface to prompt the user for input.
 * The caller is responsible for providing a descriptive question string.
 */
export function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
