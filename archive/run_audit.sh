#!/bin/bash
# SAGE PRD 全量审计脚本

cd ~/Documents/claw-outputs/projects/SAGE_Next_Gen

TASK=$(cat AUDIT_PRD_FULL.md)

# 使用 codex exec 进行审计
codex exec --full-auto "$TASK"
