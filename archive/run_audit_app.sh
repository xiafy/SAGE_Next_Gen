#!/bin/bash
TASK=$(cat AUDIT_TASK.md)
codex exec --full-auto "$TASK"
