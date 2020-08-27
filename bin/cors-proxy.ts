#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CorsProxyStack } from '../lib/cors-proxy-stack';

const app = new cdk.App();
new CorsProxyStack(app, 'CorsProxyStack');
