import { createLogger, format, transports } from 'winston'
import 'winston-mongodb'
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports'
import util from 'util'
import config from '../config/config'
import * as sourceMapSupport from 'source-map-support'

import { EApplicationEnvironment } from '../constant/application'
import path from 'path'
import { red, blue, yellow, green, magenta } from 'colorette'
import { MongoDBTransportInstance } from 'winston-mongodb'

// Linking Trace Support
sourceMapSupport.install()

const colorizeLevel = (level: string) => {
    switch (level) {
        case 'ERROR':
            return red(level)
        case 'INFO':
            return blue(level)
        case 'WARN':
            return yellow(level)
        default:
            return level
    }
}

const consoleLogFormat = format.printf((info) => {
    const { timestamp, level, message, meta = {} } = info

    const customLevel = colorizeLevel(level.toUpperCase())
    const customTimestamp = green(timestamp as string)
    const customMessage = message

    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
        colors: true
    })
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${magenta('META')} ${customMeta}\n`

    return customLog
})

const ConsoleTransport = (): Array<ConsoleTransportInstance> => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return [
            new transports.Console({
                level: 'info',
                format: format.combine(format.timestamp(), consoleLogFormat)
            })
        ]
    }
    return []
}

const fileLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info

    const logMeta: Record<string, unknown> = {}
    if (typeof meta === 'object' && meta !== null) {
        for (const [key, value] of Object.entries(meta)) {
            if (value instanceof Error) {
                logMeta[key] = {
                    name: value.name,
                    message: value.message,
                    trace: value.stack || ''
                }
            } else {
                logMeta[key] = value
            }
        }
    }
    const logData = {
        level: level.toUpperCase(),
        message,
        timestamp,
        meta: logMeta
    }

    return JSON.stringify(logData, null, 4)
})

const FileTransport = (): Array<FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, '../', '../', 'logs', `${config.ENV}.log`),
            level: 'info',
            format: format.combine(format.timestamp(), fileLogFormat)
        })
    ]
}

const MongodbTransport = (): Array<MongoDBTransportInstance> => {
    return [
        new transports.MongoDB({
            level: 'info',
            db: config.DATABASE_URL as string,
            metaKey: 'meta',
            expireAfterSeconds: 3600 * 24 * 30,
            collection: 'application-logs'
        })
    ]
}

export default createLogger({
    defaultMeta: {
        mata: {}
    },
    transports: [...FileTransport(), ...MongodbTransport(), ...ConsoleTransport()]
})
