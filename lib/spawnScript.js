/**
 * sanjo:long-running-child-process spawn script
 *
 * This script must be called like this:
 * node childProcessScript.js <PARENT_PID> <PID_FILE_PATH> <COMMAND> <COMMAND_ARGUMENTS...>
 *
 * You can terminate this script by sending a SIGINT signal to it.
 * It will also terminate automatically when the process with the given
 * parent PID no longer runs.
 */


var parentPid = process.argv[2]
var pidFilePath = process.argv[3]
var taskName = process.argv[4]
var command = process.argv[5]
var commandArguments = process.argv.slice(6)

if (isDebugMode()) {
  console.log('Spawn script arguments:')
  console.log('parentPid:', parentPid)
  console.log('taskName:', taskName)
  console.log('command:', command)
  console.log('commandArguments:', commandArguments)
  console.log('pid:', process.pid)
}

var spawn = require('child_process').spawn
var childProcess = spawn(command, commandArguments, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
})

if (isDebugMode()) {
  console.log('child.pid:', childProcess.pid)
}

childProcess.stdout.pipe(process.stdout);
childProcess.stderr.pipe(process.stderr);

startCheckForLiveParent(parentPid, taskName)

process.on('SIGINT', function () {
  if (isDebugMode()) {
    console.log('Received SIGINT. Exiting spawn script for', taskName)
  }
  shutdown()
})


function isDebugMode() {
  return process.env.LONG_RUNNING_CHILD_PROCESS_LOG_LEVEL === 'debug'
}

function shutdown() {
  childProcess.kill('SIGINT')
  var fs = require('fs');
  try {
    fs.unlinkSync(pidFilePath)
  } finally {
    process.exit(1)
  }
}

/**
 * This is the same mechanism that Meteor currently use for parent alive checking.
 * @see webapp package.
 */
function startCheckForLiveParent(parentPid, taskName) {
  setInterval(function () {
    try {
      process.kill(parentPid, 0)
    } catch (err) {
      console.log("Parent process (", parentPid ,") is dead! Exiting", taskName)
      shutdown()
    }
  }, 3000)
}
