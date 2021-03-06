/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import bunyan from 'bunyan';
import _ from 'lodash';
import { settings } from './settings';

function normalizeLogFields(rec) {
  /* eslint-disable no-unused-vars */
  const {
    name,
    v,
    hostname,
    pid,
    err,
    level,
    ...fields
  } = rec;
  /* eslint-enable no-unused-vars */

  const newRec = {
    logger: name,
    level: bunyan.nameFromLevel[level],
    process: 'node',
    ...fields
  };
  if (err) {
    newRec.error = err;
  }
  return newRec;
}

function consoleLogFunction(level) {
  switch (level) {
  case 'fatal': // fallthrough
  case 'error':
    return console.error;
  case 'warn':
    return console.warn;
  case 'info':
    return console.info;
  case 'debug':
    // According to MDN, `console.debug` may be unavailable.
    return console.debug || console.log;
  case 'trace':
    return console.trace;
  default:
    return console.log;
  }
}

class TextStream {
  write(rec) {
    /* eslint-disable no-unused-vars */
    const {
      logger,
      msg,
      level,
      time,
      error,
      tag,
      ...fields
    } = normalizeLogFields(rec);
    /* eslint-enable no-unused-vars */
    const fn = consoleLogFunction(level);
    if (!_.isEmpty(fields)) {
      fn(`[${level}] ${tag}: ${msg}, ${JSON.stringify(fields)}`);
    } else {
      fn(`[${level}] ${tag}: ${msg}`);
    }
    if (error) {
      fn(error.stack);
    }
  }
}

class JSONStream {
  write(rec) {
    const fields = normalizeLogFields(rec);
    const fn = consoleLogFunction(fields.level);
    fn(JSON.stringify(fields));
  }
}

function optsFromContext(ctx = {}) {
  const extras = {};
  const {
    request_id: requestID
  } = ctx;
  if (requestID) {
    extras.request_id = requestID; //eslint-disable-line camelcase
  }
  return extras;
}

function optsFromSettings(theSettings = {}) {
  const logLevel = theSettings.logLevel || 'info';
  const logFormat = theSettings.logFormat || 'text';
  var stream;
  if (logFormat === 'json') {
    stream = new JSONStream();
  } else {
    stream = new TextStream();
  }

  return {
    serializers: bunyan.stdSerializers,
    streams: [
      {
        type: 'raw',
        level: logLevel,
        stream: stream
      }
    ]
  };
}

export function createLogger(name, context = {}, opts = {}) {
  return bunyan.createLogger({
    name: name,
    tag: 'cloud',
    ...optsFromContext(context),
    ...optsFromSettings(settings),
    ...opts
  });
}
