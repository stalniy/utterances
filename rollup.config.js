import ts from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

const config = options => {
  const extraOutput = options.file
    ? { file: options.file }
    : { dir: `dist/${options.dir || options.format}` };
  return {
    input: 'src/index.ts',
    output: {
      sourcemap: true,
      ...extraOutput,
      format: options.format,
      name: options.name,
      plugins: [
        process.env.NODE_ENV === 'production'
          ? terser({
            mangle: {
              properties: {
                regex: /^_\w/
              }
            }
          })
          : null
      ],
    },
    plugins: [
      ts({
        declaration: false,
        module: 'es2015',
        target: options.target || 'es5',
      }),
      ...(options.plugins || [])
    ]
  };
};

export default [
  config({ format: 'es', target: 'es6', dir: 'es6m' }),
  config({ format: 'es', dir: 'es5m' }),
  config({ format: 'umd', name: 'bomments', dir: 'umd' }),
];
