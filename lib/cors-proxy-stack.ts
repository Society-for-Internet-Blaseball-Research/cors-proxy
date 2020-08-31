import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import * as pkgDir from 'pkg-dir';
import * as ts from 'typescript';

function logDiagnostic(diagnostic: ts.Diagnostic): void {
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  } else {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}

function compile(filename: string): lambda.InlineCode {
  const topDir = pkgDir.sync()!;
  if (topDir === undefined) {
    throw new Error('unable to find project root path');
  }

  const configFileName = path.join(topDir, 'tsconfig.json');
  const configFileText = fs.readFileSync(configFileName, { encoding: 'utf-8' });
  const configJson = ts.parseConfigFileTextToJson(configFileName, configFileText);
  if (configJson.error) {
    logDiagnostic(configJson.error);
    throw new Error('failed to parse tsconfig.json');
  }
  const config = ts.parseJsonConfigFileContent(
    configJson.config, ts.sys, path.dirname(configFileName),
  );
  if (config.errors.length > 0) {
    config.errors.forEach(logDiagnostic);
    throw new Error('failed to parse tsconfig.json');
  }

  const source = fs.readFileSync(path.join(topDir, 'lib', filename), { encoding: 'utf-8' });
  const result = ts.transpileModule(source, {
    compilerOptions: { ...config.options, inlineSourceMap: false },
  });
  if (result.diagnostics && result.diagnostics.length > 0) {
    result.diagnostics.forEach(logDiagnostic);
    throw new Error(`failed to compile ${filename}`);
  }
  return lambda.Code.fromInline(result.outputText);
}

export interface CorsProxyStackProps extends cdk.StackProps {
  domainName?: string,
}

export class CorsProxyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: CorsProxyStackProps) {
    super(scope, id, props);

    const domainProps: { certificate?: acm.ICertificate, domainNames?: string[] } = {};
    if (props?.domainName !== undefined) {
      domainProps.certificate = new acm.Certificate(this, 'Certificate', {
        domainName: props?.domainName,
        validation: acm.CertificateValidation.fromDns(),
      });
      domainProps.domainNames = [props?.domainName];
    }

    const code = compile('handler.ts');
    const runtime = lambda.Runtime.NODEJS_12_X;
    // https://github.com/aws/aws-cdk/issues/9998
    const role = new iam.Role(this, 'FunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    role.assumeRolePolicy!.addStatements(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      principals: [new iam.ServicePrincipal('edgelambda.amazonaws.com')],
    }));

    new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin('www.blaseball.com'),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        forwardQueryString: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        edgeLambdas: [
          {
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            functionVersion: new lambda.Function(this, 'RequestFunction', {
              code, handler: 'index.onRequest', runtime, role,
            }).currentVersion,
          },
          {
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
            functionVersion: new lambda.Function(this, 'ResponseFunction', {
              code, handler: 'index.onResponse', runtime, role,
            }).currentVersion,
          },
        ],
      },
      ...domainProps,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });
  }
}
