import sensei from './sensei.json';

const regexPatterns = sensei.regex.map(item => ({
  name: item.name,
  regex: new RegExp(item.pattern)
}));

export default regexPatterns;
