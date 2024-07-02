import sensei from './sensei.json';

const regexPatterns = sensei.regex.map(item => ({
  name: item.name,
  regex: new RegExp(item.pattern),
  functionName: item.function
}));

export default regexPatterns;
