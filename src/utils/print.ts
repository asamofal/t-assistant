import chalk from 'chalk';

interface PrintOptions {
  newLinesBefore?: number;
  newLinesAfter?: number;
}

const write = (log: (message: string) => void, message: string, options: PrintOptions) => {
  const { newLinesBefore = 0, newLinesAfter = 0 } = options;

  log('\n'.repeat(newLinesBefore) + message + '\n'.repeat(newLinesAfter));
};

export const printError = (message: string, options: PrintOptions = {}) => {
  write(console.error, chalk.red(`❗ [ERROR] ${message}`), options);
};

export const printWarning = (message: string, options: PrintOptions = {}) => {
  write(console.error, chalk.yellow(`⚠️ [WARNING] ${message}`), options);
};

export const printDebug = (message: string, options: PrintOptions = {}) => {
  write(console.error, '→ ' + chalk.italic(`[DEBUG] ${message} \n`), options);
};

export const print = (message: string, options: PrintOptions = {}) => {
  write(console.log, message, options);
};
