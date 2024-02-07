import archiver from 'archiver';
import { build } from 'esbuild';
import { createWriteStream } from 'fs';
import { copyFile, mkdir } from 'fs/promises';
import path, { dirname } from 'path';
import { function as F, taskEither as TE } from 'fp-ts';
import pkg from '../package.json';

const root = path.resolve(__dirname, '../');

const extensionName = pkg.name;
const buildDir = path.join(root, `./dist/build`);
const entry = path.join(root, './src/index.js');
const outputIndex = path.join(root, `./dist/build/${extensionName}/index.js`);
const outputExtensionScript = path.join(root, `./dist/build/extensions/${extensionName}`);
const extensionZip = path.join(root, `./dist/extension.zip`);
const extensionScript = path.join(root, `extension.sh`);

const zip = (dir: string, outputFile: string) => () =>
  TE.tryCatch(
    () => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = createWriteStream(outputFile);

      return new Promise<void>((resolve, reject) => {
        archive
          .directory(dir, false)
          .on('error', (err) => reject(err))
          .pipe(stream);

        stream.on('close', () => resolve());
        void archive.finalize();
      });
    },
    (error) => new Error(`Failed zip extension archive ${error instanceof Error ? error.message : error}`),
  );

const run = () =>
  F.pipe(
    TE.tryCatch(
      () =>
        build({
          entryPoints: [entry],
          bundle: true,
          minify: false,
          platform: 'node',
          target: 'node20',
          outfile: outputIndex,
        }),
      (error) => new Error(`Error during build: ${error instanceof Error ? error.message : error}`),
    ),
    TE.chain(() =>
      TE.tryCatch(
        async () => {
          await mkdir(dirname(outputExtensionScript), { recursive: true });
          await copyFile(extensionScript, outputExtensionScript);
        },
        (error) =>
          new Error(`Error copying extension script to destination: ${error instanceof Error ? error.message : error}`),
      ),
    ),
    TE.chain(zip(buildDir, extensionZip)),
  )();

run()
  .then(() => {
    console.log(
      `\x1b[32mBuilt extension ${extensionName} successfully, to deploy into your infrastructure run: \x1b[0m`,
    );
    console.log(
      `aws lambda publish-layer-version --layer-name "${extensionName}" --region <region> --zip-file "fileb://${extensionZip}"`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
