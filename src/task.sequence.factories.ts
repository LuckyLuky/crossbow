import {transformStrings} from "./task.utils";
const assign = require('object-assign');

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve";
import {RunCommandTrigger} from "./command.run";
import {Runner} from "./runner";
import Seq = Immutable.Seq;
import {TaskStats} from "./task.runner";

export enum SequenceItemTypes {
    SeriesGroup,
    ParallelGroup,
    Task
}

export interface SequenceItem {
    type: SequenceItemTypes
    taskName?: string
    task?: Task
    items: SequenceItem[]
    factory?: (obs: any, opts: any, ctx: RunCommandTrigger) => any
    fnName?: string
    config?: any
    subTaskName?: string
    stats?: TaskStats
    seqUID: number
}

export interface SequenceSeriesGroup {
    taskName: string
    items: any[]
}

export interface SequenceParallelGroup extends SequenceSeriesGroup {}

export interface SequenceTask {
    fnName: string,
    factory: TaskFactory,
    task: Task,
    config: any
}

export interface TaskFactory {
    (task: Task, trigger: RunCommandTrigger): any
    tasks?: TaskFactory[]
    name?: string
}
var seqUID = 0;
export function createSequenceTaskItem(incoming: SequenceTask): SequenceItem {
    return assign({type: SequenceItemTypes.Task, items: [], seqUID: seqUID++}, incoming);
}

export function createSequenceSeriesGroup(incoming: SequenceSeriesGroup): SequenceItem {
    return assign({type: SequenceItemTypes.SeriesGroup}, incoming);
}

export function createSequenceParallelGroup(incoming: SequenceParallelGroup): SequenceItem {
    return assign({type: SequenceItemTypes.ParallelGroup}, incoming);
}