#!/bin/bash
# Copyright 2022 Harness Inc. All rights reserved.
# Use of this source code is governed by the PolyForm Free Trial 1.0.0 license
# that can be found in the licenses directory at the root of this repository, also available at
# https://polyformproject.org/wp-content/uploads/2020/05/PolyForm-Free-Trial-1.0.0.txt.
echo "Downloading jira-projects.txt from harness-core"
if [ ! -d "$HOME/tmp" ]
then
  echo "Creating folder $HOME/tmp"
  mkdir "$HOME/tmp"
  CREATED="true"
fi

if [[ "$GHTOK" == "" ]]; then
  resp=$(curl -s https://raw.githubusercontent.com/harness/harness-core/develop/jira-projects.txt --write-out '%{http_code}' --output "$HOME/tmp/jira-projects.txt")
else
  resp=$(curl -H "Authorization: Bearer $GHTOK" -s https://raw.githubusercontent.com/harness/harness-core/develop/jira-projects.txt --write-out '%{http_code}' --output "$HOME/tmp/jira-projects.txt")
fi
if [ "$?" -eq 0 ]
then
  if [ "$resp" -ne 200 ]
  then
    echo "Could not download jira-projects.txt from harness/harness-core/develop in github"
    exit 1
  fi
else
  echo "curl command malformed."
  exit 1
fi
# Read Jira projects in from the file and then clean up
export PROJECTS=$(<"$HOME/tmp/jira-projects.txt")
rm "$HOME/tmp/jira-projects.txt"
if [ "$CREATED" == "true" ]
then
  echo "Cleaning up $HOME/tmp"
  rmdir "$HOME/tmp"
fi
