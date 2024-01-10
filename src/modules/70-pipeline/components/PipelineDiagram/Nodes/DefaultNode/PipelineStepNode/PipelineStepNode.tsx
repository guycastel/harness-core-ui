/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { cloneDeep, debounce, defaultTo, get, set, unset, isEmpty } from 'lodash-es'
import { HarnessIcons, Icon, Text, Button, ButtonVariation, IconName, Utils } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { Switch } from '@blueprintjs/core'
import produce from 'immer'
import {
  DiagramDrag,
  DiagramType,
  Event,
  IS_NODE_TOGGLE_DISABLED
} from '@pipeline/components/PipelineDiagram/Constants'
import { ExecutionStatus, ExecutionStatusEnum } from '@pipeline/utils/statusHelpers'
import stepsfactory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { getStatusProps } from '@pipeline/components/ExecutionStageDiagram/ExecutionStageDiagramUtils'
import { ExecutionPipelineNodeType } from '@pipeline/components/ExecutionStageDiagram/ExecutionPipelineModel'
import { useStrings } from 'framework/strings'
import { ImagePreview } from '@common/components/ImagePreview/ImagePreview'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { updateStepWithinStageViaPath } from '@pipeline/components/PipelineStudio/RightDrawer/RightDrawer'
import {
  getStepsPathWithoutStagePath,
  getParentPath
} from '@pipeline/components/PipelineStudio/ExecutionGraph/ExecutionGraphUtil'
import { RUNTIME_NODE_SUFFIX } from '@modules/70-pipeline/utils/execUtils'
import SVGMarker from '../../SVGMarker'
import { BaseReactComponentProps, NodeType } from '../../../types'
import AddLinkNode from '../AddLinkNode/AddLinkNode'
import {
  getPositionOfAddIcon,
  attachDragImageToEventHandler,
  getBaseDotNotationWithoutEntityIdentifier,
  getConditionalClassName
} from '../../utils'
import defaultCss from '../DefaultNode.module.scss'

const CODE_ICON: IconName = 'command-echo'

const TEMPLATE_ICON: IconName = 'template-library'
interface PipelineStepNodeProps extends BaseReactComponentProps {
  status: string
  isNodeCollapsed?: boolean
  matrixNodeName?: string
  onToggleClick?: (e: React.MouseEvent<Element, MouseEvent>) => void
}

function PipelineStepNode(props: PipelineStepNodeProps): JSX.Element {
  const { getString } = useStrings()
  const allowAdd = defaultTo(props.allowAdd, false)
  const [showAddNode, setVisibilityOfAdd] = React.useState(false)
  const {
    state: {
      pipelineView,
      selectionState: { selectedStageId }
    },
    updateStage,
    updatePipelineView,
    getStageFromPipeline
  } = usePipelineContext()

  const whenCondition = IS_NODE_TOGGLE_DISABLED && props?.data?.step?.when?.condition === 'false'
  const { stage: selectedStage } = getStageFromPipeline(defaultTo(selectedStageId, ''))

  const stepType = props.type || props?.data?.step?.stepType || props?.data?.step?.template?.templateInputs?.type || ''
  const stepData = stepsfactory.getStepData(stepType)
  const isStepNonDeletable = stepsfactory.getIsStepNonDeletable(stepType)
  let stepIconColor = stepsfactory.getStepIconColor(stepType)
  if (stepIconColor && Object.values(Color).includes(stepIconColor)) {
    stepIconColor = Utils.getRealCSSColor(stepIconColor)
  }
  const CreateNode: React.FC<any> | undefined = props?.getNode?.(NodeType.CreateNode)?.component
  const showMarkers = defaultTo(props?.showMarkers, true)

  const stepStatus = defaultTo(props?.status, props?.data?.step?.status as ExecutionStatus)
  const { secondaryIconProps, secondaryIcon, secondaryIconStyle } = getStatusProps(
    stepStatus as ExecutionStatus,
    ExecutionPipelineNodeType.NORMAL
  )

  const isStepUsedInProvisioner = props?.data?.nodeStateMetadata?.dotNotationPath?.includes('provisioner')
  const stepFQNPath = getStepsPathWithoutStagePath(props?.data?.nodeStateMetadata?.dotNotationPath)
  const relativeFQNPath = getBaseDotNotationWithoutEntityIdentifier(props?.data?.nodeStateMetadata?.relativeBasePath)
  const nodeSelectedId = isEmpty(stepStatus) ? stepFQNPath : props.id
  const isSelectedNode = (): boolean =>
    props.isSelected || nodeSelectedId.replace(new RegExp(`${RUNTIME_NODE_SUFFIX}$`), '') === props?.selectedNodeId
  const isServiceStep = stepType === 'Service'
  const setAddVisibility = (visibility: boolean): void => {
    if (!allowAdd) {
      return
    }
    setVisibilityOfAdd(visibility)
  }

  const stepIcon = defaultTo(defaultTo(stepData?.icon, props?.icon), props?.data?.step?.icon)
  const isSelectedCss = () => {
    if (!isSelectedNode()) {
      return {}
    }
    if (HarnessIcons[`${stepIcon}-inverse`]) {
      // Use inverted icon if it exists within harness/uicore
      return { inverse: true }
    }
    // flatten icon to white
    return { color: Color.WHITE, className: defaultCss.primaryIcon, inverse: true }
  }

  const stepIconUrl = props.iconUrl

  const onDropEvent = /* istanbul ignore next */ (event: React.DragEvent): void => {
    event.stopPropagation()

    props?.fireEvent?.({
      type: Event.DropNodeEvent,
      target: event.target,
      data: {
        entityType: DiagramType.Default,
        node: JSON.parse(event.dataTransfer.getData(DiagramDrag.NodeDrag)),
        destination: props
      }
    })
  }

  const debounceHideVisibility = debounce(() => {
    setVisibilityOfAdd(false)
  }, 300)
  // const isPrevNodeParallel = !!defaultTo(props.prevNode?.children?.length, 1)
  const isTemplateNode = props?.data?.isTemplateNode || props?.data?.step?.template || props?.data?.stepGroup?.template
  const isToggleAllowed = props?.data?.isInComplete || stepStatus || isTemplateNode || !IS_NODE_TOGGLE_DISABLED

  return (
    <div
      className={cx(defaultCss.defaultNode, 'default-node', {
        draggable: !props.readonly
      })}
      onMouseOver={
        /* istanbul ignore next */ e => {
          e.stopPropagation()
          setAddVisibility(true)
        }
      }
      onMouseLeave={
        /* istanbul ignore next */ e => {
          e.stopPropagation()
          debounceHideVisibility()
        }
      }
      onClick={event => {
        event.stopPropagation()
        if (props?.onClick) {
          props.onClick(event)
          return
        }
        props?.fireEvent?.({
          type: Event.ClickNode,
          target: event.target,
          data: {
            entityType: DiagramType.Default,
            ...props
          }
        })
      }}
      onMouseDown={e => e.stopPropagation()}
      onDragOver={
        /* istanbul ignore next */ event => {
          event.stopPropagation()

          if (event.dataTransfer.types.indexOf(DiagramDrag.AllowDropOnNode) !== -1) {
            setAddVisibility(true)
            event.preventDefault()
          }
        }
      }
      onDragLeave={
        /* istanbul ignore next */ event => {
          event.stopPropagation()

          if (event.dataTransfer.types.indexOf(DiagramDrag.AllowDropOnNode) !== -1) {
            debounceHideVisibility()
          }
        }
      }
      onDrop={onDropEvent}
    >
      {!isServiceStep && showMarkers && (
        <div className={cx(defaultCss.markerStart, defaultCss.stepMarker, defaultCss.stepMarkerLeft)}>
          <SVGMarker />
        </div>
      )}
      <div
        id={props.id}
        data-nodeid={props.id}
        draggable={!props.readonly}
        data-collapsedNode={props?.isNodeCollapsed}
        className={cx(defaultCss.defaultCard, {
          [defaultCss.selected]: isSelectedNode() && !whenCondition,
          [defaultCss.failed]: stepStatus === ExecutionStatusEnum.Failed,
          [defaultCss.runningNode]: stepStatus === ExecutionStatusEnum.Running,
          [defaultCss.skipped]: stepStatus === ExecutionStatusEnum.Skipped,
          [defaultCss.notStarted]: stepStatus === ExecutionStatusEnum.NotStarted,
          [defaultCss.disabled]: whenCondition
        })}
        style={{
          width: 64,
          height: 64
        }}
        onDragStart={
          /* istanbul ignore next */ event => {
            event.stopPropagation()
            props?.fireEvent?.({
              type: Event.DragStart,
              target: event.target,
              data: { ...props }
            })
            event.dataTransfer.setData(DiagramDrag.NodeDrag, JSON.stringify(props))
            // NOTE: onDragOver we cannot access dataTransfer data
            // in order to detect if we can drop, we are setting and using "keys" and then
            // checking in onDragOver if this type (AllowDropOnLink/AllowDropOnNode) exist we allow drop
            event.dataTransfer.setData(DiagramDrag.AllowDropOnLink, '1')
            event.dataTransfer.setData(DiagramDrag.AllowDropOnNode, '1')
            event.dataTransfer.dropEffect = 'move'
            attachDragImageToEventHandler(event)
          }
        }
        onDragEnd={
          /* istanbul ignore next */ event => {
            event.preventDefault()
            event.stopPropagation()
          }
        }
        onMouseEnter={
          /* istanbul ignore next */ event => {
            event.stopPropagation()

            props?.fireEvent?.({
              type: Event.MouseEnterNode,
              target: event.target,
              data: { ...props }
            })
          }
        }
        onMouseLeave={
          /* istanbul ignore next */ event => {
            event.stopPropagation()
            setVisibilityOfAdd(false)
            props?.fireEvent?.({
              type: Event.MouseLeaveNode,
              target: event.target,
              data: { ...props }
            })
          }
        }
      >
        <div className="execution-running-animation" />
        {props?.data?.isInComplete && (
          <Icon className={defaultCss.incomplete} size={12} name={'warning-sign'} color="orange500" />
        )}
        {stepIconUrl ? (
          <ImagePreview size={28} src={stepIconUrl} fallbackIcon={defaultTo(stepIcon, 'cross') as IconName} />
        ) : (
          stepIcon && (
            <>
              <Icon
                size={40}
                {...isSelectedCss()}
                name={defaultTo(stepIcon, 'cross') as IconName}
                {...getConditionalClassName(whenCondition)}
              />
            </>
          )
        )}
        {!isToggleAllowed && (
          <div
            className={cx(defaultCss.switch, { [defaultCss.stageSelectedSwitch]: isSelectedNode() })}
            data-testid="toggle-step-node"
            onClick={e => {
              if (props?.onToggleClick) {
                props?.onToggleClick(e)
              } else {
                e.stopPropagation()
                e.preventDefault()
                const originalStepData = cloneDeep(props?.data?.step)
                if (whenCondition) {
                  unset(originalStepData, 'when')
                } else {
                  set(originalStepData, 'when.condition', 'false')
                  set(originalStepData, 'when.stageStatus', 'Success')
                }
                const processingNodeIdentifier = props.identifier
                if (processingNodeIdentifier) {
                  const stageData = produce(selectedStage, draft => {
                    if (get(draft, getParentPath(isStepUsedInProvisioner))) {
                      updateStepWithinStageViaPath(
                        get(draft, getParentPath(isStepUsedInProvisioner)),
                        originalStepData,
                        props?.data?.nodeStateMetadata?.relativeBasePath,
                        props?.data?.nodeStateMetadata?.dotNotationPath
                      )
                    }
                  })
                  // update view data before updating pipeline because its async
                  updatePipelineView(
                    produce(pipelineView, draft => {
                      set(draft, 'drawerData.data.stepConfig.node', originalStepData)
                    })
                  )

                  if (stageData?.stage) {
                    updateStage(stageData.stage)
                  }
                }
              }
            }}
          >
            <Switch aria-label="Global Freeze Toggle" checked={!whenCondition} />
          </div>
        )}
        {secondaryIcon && (
          <Icon
            name={secondaryIcon}
            style={secondaryIconStyle}
            size={13}
            {...secondaryIconProps}
            {...getConditionalClassName(whenCondition, defaultCss.secondaryIcon)}
          />
        )}
        {props.data?.skipCondition && (
          <div className={defaultCss.conditional}>
            <Text
              tooltip={`Skip condition:\n${props.data?.skipCondition}`}
              tooltipProps={{
                isDark: true
              }}
            >
              <Icon size={26} name={'conditional-skip-new'} {...getConditionalClassName(whenCondition)} />
            </Text>
          </div>
        )}
        {props.data?.conditionalExecutionEnabled && (
          <div className={defaultCss.conditional}>
            <Text
              tooltip={getString('pipeline.conditionalExecution.title')}
              tooltipProps={{
                isDark: true
              }}
            >
              <Icon size={26} name={'conditional-skip-new'} {...getConditionalClassName(whenCondition)} />
            </Text>
          </div>
        )}
        {props.data?.loopingStrategyEnabled && (
          <div className={defaultCss.loopingStrategy}>
            <Text
              tooltip={getString('pipeline.loopingStrategy.title')}
              tooltipProps={{
                isDark: true
              }}
            >
              <Icon
                size={16}
                name={'looping'}
                background={Color.PURPLE_300}
                {...(isSelectedNode() ? { color: Color.WHITE, className: defaultCss.primaryIcon, inverse: true } : {})}
                {...getConditionalClassName(whenCondition)}
              />
            </Text>
          </div>
        )}
        {isTemplateNode && (
          <Icon
            {...(isSelectedNode()
              ? { color: Color.WHITE, className: cx(defaultCss.primaryIcon, defaultCss.templateIcon), inverse: true }
              : { className: defaultCss.templateIcon })}
            size={8}
            name={TEMPLATE_ICON}
          />
        )}
        {CODE_ICON && (
          <Icon
            color={isSelectedNode() ? Color.WHITE : undefined}
            size={8}
            name={CODE_ICON}
            {...getConditionalClassName(whenCondition, defaultCss.codeIcon)}
          />
        )}
        {!isStepNonDeletable && (
          <Button
            className={cx(defaultCss.closeNode, { [defaultCss.readonly]: props.readonly })}
            minimal
            icon="cross"
            variation={ButtonVariation.PRIMARY}
            iconProps={{ size: 10 }}
            onMouseDown={e => {
              e.stopPropagation()
              props?.fireEvent?.({
                type: Event.RemoveNode,
                target: e.target,
                data: { identifier: props?.identifier, node: props }
              })
            }}
            withoutCurrentColor={true}
          />
        )}
      </div>
      {!isServiceStep && showMarkers && (
        <div className={cx(defaultCss.markerEnd, defaultCss.stepMarker, defaultCss.stepMarkerRight)}>
          <SVGMarker />
        </div>
      )}
      {props.name && (
        <div className={defaultCss.nodeNameText}>
          <Text
            width={125}
            height={64}
            font={{ size: 'normal', align: 'center' }}
            color={props.defaultSelected ? Color.GREY_900 : Color.GREY_600}
            padding={'small'}
            lineClamp={2}
          >
            {props.name}
          </Text>
        </div>
      )}
      {allowAdd && CreateNode && !props.readonly && !isServiceStep && (
        <CreateNode
          onMouseOver={() => setAddVisibility(true)}
          onDragOver={() => setAddVisibility(true)}
          onDrop={onDropEvent}
          onMouseLeave={debounceHideVisibility}
          onDragLeave={debounceHideVisibility}
          onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            event.stopPropagation()
            props?.fireEvent?.({
              type: Event.AddParallelNode,
              target: event.target,
              data: {
                identifier: props?.identifier,
                parentIdentifier: props?.parentIdentifier,
                entityType: DiagramType.Default,
                node: props,
                relativeBasePath: relativeFQNPath
              }
            })
          }}
          className={cx(defaultCss.addNode, defaultCss.stepAddNode, { [defaultCss.visible]: showAddNode })}
          wrapperClassname={defaultCss.floatingAddNodeWrapper}
          data-nodeid="add-parallel"
          relativeBasePath={relativeFQNPath}
        />
      )}
      {!props.isParallelNode && !isServiceStep && !props.readonly && (
        <AddLinkNode<PipelineStepNodeProps>
          nextNode={props?.nextNode}
          parentIdentifier={props?.parentIdentifier}
          isParallelNode={props.isParallelNode}
          readonly={props.readonly}
          data={props}
          fireEvent={props.fireEvent}
          identifier={props.identifier}
          prevNodeIdentifier={props.prevNodeIdentifier as string}
          style={{ left: getPositionOfAddIcon(props) }}
          relativeBasePath={relativeFQNPath}
          className={cx(defaultCss.addNodeIcon, 'stepAddIcon')}
          isAnyParentContainerStepGroup={props?.data?.isAnyParentContainerStepGroup}
        />
      )}
      {!props?.nextNode && !isServiceStep && props?.parentIdentifier && !props.readonly && !props.isParallelNode && (
        <AddLinkNode<PipelineStepNodeProps>
          nextNode={props?.nextNode}
          style={{ right: getPositionOfAddIcon(props, true) }}
          parentIdentifier={props?.parentIdentifier}
          isParallelNode={props.isParallelNode}
          readonly={props.readonly}
          data={props}
          fireEvent={props.fireEvent}
          isRightAddIcon={true}
          identifier={props.identifier}
          prevNodeIdentifier={props.prevNodeIdentifier as string}
          relativeBasePath={relativeFQNPath}
          className={cx(defaultCss.addNodeIcon, 'stepAddIcon')}
          isAnyParentContainerStepGroup={props?.data?.isAnyParentContainerStepGroup}
        />
      )}
    </div>
  )
}

export default PipelineStepNode
