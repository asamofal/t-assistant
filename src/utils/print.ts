import chalk from 'chalk';

interface PrintOptions {
  newLinesBefore?: number;
  newLinesAfter?: number;
}

export const printError = (message: string, options: PrintOptions = {}) => {
  print(chalk.red(`❗ [ERROR] ${message}`), options);
};

export const printWarning = (message: string, options: PrintOptions = {}) => {
  print(chalk.yellow(`⚠️ [WARNING] ${message}`), options);
};

export const printDebug = (message: string, options: PrintOptions = {}) => {
  print('→ ' + chalk.italic(`[DEBUG] ${message} \n`), options);
};

export const print = (message: string, options: PrintOptions = {}) => {
  const { newLinesBefore = 0, newLinesAfter = 0 } = options;

  message = '\n'.repeat(newLinesBefore) + message + '\n'.repeat(newLinesAfter);

  console.log(message);
};
