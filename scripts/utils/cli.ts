import minimist from 'minimist';

export interface CliOptions {
  only?: string[];
  skip?: string[];
}

export function parseCliArgs(argv: string[]): CliOptions {
  const args = minimist(argv.slice(2), {
    string: ['only', 'skip'],
    alias: {},
    default: {},
  });

  let only: string[] = [];
  let skip: string[] = [];

  if (typeof args.only === 'string') {
    only = args.only.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(args.only)) {
    only = args.only.flatMap((s: string) => s.split(',').map((x: string) => x.trim()));
  }

  if (typeof args.skip === 'string') {
    skip = args.skip.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(args.skip)) {
    skip = args.skip.flatMap((s: string) => s.split(',').map((x: string) => x.trim()));
  }

  return { only, skip };
}
