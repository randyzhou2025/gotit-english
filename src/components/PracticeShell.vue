<template>
  <view :class="['screen', showBottomNav && 'hasBottomNav']">
    <view v-if="showAppHeader" class="appHeader">
      <view>
        <text class="brand">会了吗英语</text>
        <text class="tagline">词汇体检 / 自动听写</text>
      </view>
      <view class="headerMark">
        <text>GotIt</text>
      </view>
    </view>

    <view v-if="screen === 'home'" class="sectionStack homeScreen">
      <view class="homeUnitCard">
        <view class="homeUnitTopline">
          <text class="homeUnitLabel">当前单元</text>
          <text class="homeUnitMeta">{{ unitMasteryPercent }}% 掌握</text>
        </view>

        <text class="homeUnitTitle">{{ selectedUnit?.publisherName }} {{ selectedUnit?.bookName }}</text>
        <view class="homeUnitRow">
          <text class="homeUnitBadge">Unit {{ selectedUnit?.unitNumber }}</text>
          <view class="homeMasteryPill">
            <view class="homeMasteryPillFill" :style="{ width: unitMasteryPercent + '%' }" />
            <text>{{ unitMasteryLabel }} 已掌握</text>
          </view>
        </view>

        <view class="homeStatRow">
          <view class="homeStatPrimary" @tap="openUnitWords">
            <text class="homeStatNumber">{{ unitWordCount }}</text>
            <view>
              <text class="homeStatTitle">总单词</text>
              <text class="homeStatHint">查看完整词表</text>
            </view>
          </view>
          <view class="homeStatSecondary" @tap="openUnitWords">
            <text class="homeStatNumber">{{ activeWords.length }}</text>
            <view>
              <text class="homeStatTitle">待练</text>
              <text class="homeStatHint">未掌握词</text>
            </view>
          </view>
        </view>

        <view class="unitSwitchGrid">
          <picker :range="schoolStageOptions" :value="selectedSchoolStageIndex" @change="onSchoolStageChange">
            <view class="unitSwitchCell">
              <text class="unitSwitchLabel">学段</text>
              <text class="unitSwitchValue">{{ schoolStageOptions[selectedSchoolStageIndex] }}</text>
            </view>
          </picker>
          <picker :range="publisherOptions" :value="selectedPublisherIndex" @change="onPublisherChange">
            <view class="unitSwitchCell">
              <text class="unitSwitchLabel">版本</text>
              <text class="unitSwitchValue">{{ publisherOptions[selectedPublisherIndex] }}</text>
            </view>
          </picker>
          <picker :range="bookOptions" :value="selectedBookIndex" @change="onBookChange">
            <view class="unitSwitchCell">
              <text class="unitSwitchLabel">册</text>
              <text class="unitSwitchValue">{{ bookOptions[selectedBookIndex] }}</text>
            </view>
          </picker>
          <picker :range="unitQuickOptions" :value="selectedUnitQuickIndex" @change="onUnitQuickChange">
            <view class="unitSwitchCell">
              <text class="unitSwitchLabel">Unit</text>
              <text class="unitSwitchValue">{{ unitQuickOptions[selectedUnitQuickIndex] }}</text>
            </view>
          </picker>
        </view>

        <text class="homeUnitTip">标记认识后，该词不会进入体检和听写。</text>
      </view>

      <view class="homeActionHeader">
        <text class="homeActionTitle">开始练习</text>
        <text class="homeActionMeta">先测薄弱词</text>
      </view>

      <view class="practiceList">
        <view class="practiceItem isPrimary" @tap="openCheckupSetup">
          <view class="practiceRank">
            <text>1</text>
          </view>
          <view class="practiceCopy">
            <text class="practiceTitle">词汇体检</text>
            <text class="practiceDesc">先测出真正不会的词</text>
            <text class="practiceMini">默认 {{ effectiveCheckupLimit }} 题，可调整</text>
          </view>
          <view class="practiceAction">
            <text>开始</text>
          </view>
        </view>

        <view class="practiceItem isSecondary" @tap="openDictationSetup">
          <view class="practiceRank blue">
            <text>2</text>
          </view>
          <view class="practiceCopy">
            <text class="practiceTitle">自动听写</text>
            <text class="practiceDesc">听英文或中文，写出单词</text>
            <text class="practiceMini">可选在线输入或纸笔默写</text>
          </view>
          <view class="practiceAction">
            <text>设置</text>
          </view>
        </view>
      </view>

    </view>

    <view v-else-if="screen === 'checkupSetup'" class="checkupSetupScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="resetPractice">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">词汇体检</text>
      </view>

      <view class="checkupIntro">
        <text class="wordPickerTitle">Unit {{ selectedUnit?.unitNumber }}</text>
        <text class="wordPickerMeta">先测出不会的，再决定练哪些。</text>
      </view>

      <view class="checkupStatGrid">
        <view class="checkupStat">
          <text class="checkupStatValue">{{ activeWords.length }}</text>
          <text class="checkupStatLabel">可练词数</text>
        </view>
        <view class="checkupStat checkupStatEditable">
          <view class="checkupLimitShell">
            <input
              class="checkupLimitInput"
              type="number"
              :value="checkupLimitDraft"
              confirm-type="done"
              @focus="onCheckupLimitFocus"
              @input="onCheckupLimitInput"
              @blur="commitCheckupLimitDraft"
              @confirm="commitCheckupLimitDraft"
            />
            <text class="checkupLimitSuffix">题</text>
          </view>
          <text class="checkupStatLabel">体检题数</text>
          <text class="checkupEditHint">可自定义</text>
        </view>
        <view class="checkupStat">
          <text class="checkupStatValue">≈{{ checkupEstimateMinutes }}</text>
          <text class="checkupStatLabel">分钟</text>
        </view>
      </view>

      <view class="checkupLimitOptions">
        <view
          v-for="option in checkupLimitOptions"
          :key="option"
          :class="['checkupLimitOption', isCheckupLimitOptionActive(option) && 'isActive']"
          @tap="applyCheckupLimitOption(option)"
        >
          <text>{{ getCheckupLimitOptionLabel(option) }}</text>
        </view>
      </view>

      <view class="checkupSteps">
        <view class="checkupStep">
          <text class="stepIndex">01</text>
          <view>
            <text class="stepTitle">看词选义</text>
            <text class="stepText">判断是否认识这个词</text>
          </view>
        </view>
        <view class="checkupStep">
          <text class="stepIndex">02</text>
          <view>
            <text class="stepTitle">看义拼写</text>
            <text class="stepText">判断是否真的会写</text>
          </view>
        </view>
        <view class="checkupStep">
          <text class="stepIndex">03</text>
          <view>
            <text class="stepTitle">生成生词</text>
            <text class="stepText">只留下需要补强的词</text>
          </view>
        </view>
      </view>

      <view class="dictationStartButton" @tap="startCheckupFromSetup">
        <text>开始体检</text>
      </view>
    </view>

    <view v-else-if="screen === 'weakbook'" class="sectionStack">
      <view class="flowHeader">
        <view class="backButton" @tap="resetPractice">返回</view>
        <view class="flowTitle">
          <text class="flowTitleText">生词本</text>
          <text class="flowMeta">{{ savedWeakWords.length }} 个</text>
        </view>
      </view>

      <view class="weakbookHero">
        <text class="labelText">当前选择</text>
        <text class="setupTitle">{{ selectedWeakWordCount }} 个词</text>
        <text class="setupText">选择要处理的生词。体检或在线听写正确后，会自动移出生词本。</text>
      </view>

      <view v-if="savedWeakWords.length === 0" class="weakList">
        <text class="blockTitle">暂无生词</text>
        <view class="emptyState">
          <text>体检或在线听写出错的单词，会自动进入生词本。</text>
        </view>
      </view>

      <view v-else class="weakbookPanel">
        <view class="weakbookToolbar">
          <view class="smallButton" @tap="allWeakWordsSelected ? clearWeakWordSelection() : selectAllWeakWords()">
            <text>{{ allWeakWordsSelected ? '清空' : '全选' }}</text>
          </view>
          <text class="toolbarText">已选 {{ selectedWeakWordCount }} / {{ savedWeakWords.length }}</text>
        </view>

        <view class="weakbookActions">
          <view
            :class="['bottomButton', selectedWeakWordCount === 0 && 'isDisabled']"
            @tap="startSelectedWeakCheckup"
          >
            <text>体检选中</text>
          </view>
          <view
            :class="['secondaryButton', selectedWeakWordCount === 0 && 'isDisabled']"
            @tap="openSelectedWeakDictationSetup"
          >
            <text>听写选中</text>
          </view>
          <view
            :class="['dangerButton', selectedWeakWordCount === 0 && 'isDisabled']"
            @tap="markSelectedWeakWordsKnown"
          >
            <text>标记认识</text>
          </view>
        </view>

        <view class="selectWordList">
          <view
            v-for="word in savedWeakWords"
            :key="word.id"
            :class="['selectWordRow', isWeakWordSelected(word.id) && 'isSelected']"
            @tap="toggleWeakWordSelection(word.id)"
          >
            <view class="selectDot">
              <text v-if="isWeakWordSelected(word.id)">✓</text>
            </view>
            <view class="selectWordCopy">
              <text class="weakWord">{{ word.word }}</text>
              <text class="weakMeaning">{{ word.meaning }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="screen === 'unitWords'" class="unitWordScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="resetPractice">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">全部单词</text>
      </view>

      <view class="unitWordHeader">
        <text class="unitWordTitle">{{ selectedUnit?.bookName }} Unit {{ selectedUnit?.unitNumber }}</text>
        <text class="unitWordMeta">已掌握 {{ unitMasteryLabel }}</text>
        <text class="unitWordTip">标记认识后，该词不会进入体检和听写。</text>
      </view>

      <view class="unitWordList">
        <view
          v-for="word in unitWords"
          :key="word.id"
          :class="['unitWordRow', isUnitWordMastered(word.id) && 'isMastered']"
        >
          <view class="unitWordCopy">
            <text class="unitWordEnglish">{{ word.word }}</text>
            <text class="unitWordMeaning">{{ word.meaning }}</text>
          </view>
          <view
            :class="['unitWordKnownButton', isUnitWordMastered(word.id) && 'isDone']"
            @tap.stop="markUnitWordKnown(word.id)"
          >
            <text>{{ isUnitWordMastered(word.id) ? '已掌握' : '认识' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="screen === 'checkup' && currentCheckupQuestion" class="flowScreen">
      <view class="flowHeader progressHeader">
        <view class="backButton" @tap="resetPractice">返回</view>
        <view class="flowProgress">
          <view class="progressTopline">
            <text class="flowTitleText">词汇体检</text>
            <text class="flowMeta">{{ checkupProgressLabel }}</text>
          </view>
          <view class="progressTrack">
            <view class="progressFill" :style="{ width: checkupProgressPercent + '%' }" />
          </view>
        </view>
      </view>

      <view class="questionPanel">
        <view v-if="recognitionState === 'correct'" class="celebrationLayer">
          <view
            v-for="piece in rewardParticles"
            :key="piece.id"
            class="rewardParticle"
            :style="piece.style"
          />
        </view>
        <text class="labelText">选出释义</text>
        <text class="wordTitle">{{ currentCheckupQuestion.word.word }}</text>
        <text class="phonetic">{{ currentCheckupQuestion.word.phonetic }} {{ currentCheckupQuestion.word.partOfSpeech }}</text>

        <view v-if="recognitionState === 'wrong'" class="wrongActionBar">
          <view class="wrongActionCopy">
            <text class="wrongActionTitle">已加入生词本</text>
            <text class="wrongActionText">正确：{{ currentCheckupQuestion.word.meaning }}</text>
          </view>
          <view class="inlineNextButton" @tap.stop="nextAfterWrong">
            <text>{{ wrongNextLabel }}</text>
          </view>
        </view>

        <view class="choiceList">
          <view
            v-for="(choice, index) in currentCheckupQuestion.meaningChoices"
            :key="choice"
            :class="getChoiceClass(choice)"
            @tap="selectMeaning(choice)"
          >
            <text class="choiceKey">{{ choiceKeys[index] }}</text>
            <text class="choiceText">{{ choice }}</text>
            <text v-if="isCorrectSelected(choice)" class="choiceResult">对</text>
            <text v-else-if="isWrongSelected(choice)" class="choiceResult wrong">错</text>
          </view>
        </view>
      </view>

      <view v-if="recognitionState === 'correct'" class="feedbackBox success">
        <text class="feedbackTitle">选对了</text>
        <text class="feedbackText">正在进入拼写</text>
      </view>
    </view>

    <view v-else-if="screen === 'spelling' && currentCheckupQuestion" class="flowScreen">
      <view class="flowHeader progressHeader">
        <view class="backButton" @tap="resetPractice">返回</view>
        <view class="flowProgress">
          <view class="progressTopline">
            <text class="flowTitleText">拼出单词</text>
            <text class="flowMeta">{{ checkupProgressLabel }}</text>
          </view>
          <view class="progressTrack">
            <view class="progressFill" :style="{ width: checkupProgressPercent + '%' }" />
          </view>
        </view>
      </view>

      <view class="spellPanel">
        <text class="labelText">根据释义拼写</text>
        <text class="meaningTitle">{{ currentCheckupQuestion.word.meaning }}</text>
        <text class="phonetic">{{ currentCheckupQuestion.word.partOfSpeech }}</text>

        <view class="fieldGroup">
          <text class="fieldLabel">英文单词</text>
          <input
            v-model="spellingInput"
            class="textInput"
            placeholder="输入英文单词"
            placeholder-class="inputPlaceholder"
            confirm-type="done"
            @confirm="submitSpelling"
          />
        </view>
      </view>

      <view
        :class="['bottomButton', !spellingInput.trim() && 'isDisabled']"
        @tap="submitSpelling"
      >
        <text>提交</text>
      </view>
    </view>

    <view v-else-if="screen === 'report'" class="sectionStack reportScreen">
      <view class="flowHeader">
        <view class="backButton" @tap="resetPractice">返回</view>
        <view class="flowTitle">
          <text class="flowTitleText">体检报告</text>
          <text class="flowMeta">{{ checkupSummary.accuracy }}%</text>
        </view>
      </view>

      <view class="reportHero">
        <view class="reportTopline">
          <view class="reportCopy">
            <text class="labelText">本次抽样体检</text>
            <text class="reportText">
              {{ weakWords.length > 0 ? `已记录 ${weakWords.length} 个生词` : '本轮词汇掌握稳定' }}
            </text>
          </view>
        </view>

        <view class="scoreVisual">
          <view class="scoreNumberBlock" :style="{ '--score': checkupSummary.accuracy + '%' }">
            <text class="reportScore">{{ checkupSummary.accuracy }}%</text>
            <text class="scoreBadgeLabel">掌握率</text>
          </view>
          <view class="scoreMeter">
            <view class="masteryRail">
              <view class="railSegment mastered" :style="{ width: masteredSegmentWidth }" />
              <view class="railSegment mid" :style="{ width: recognitionSegmentWidth }" />
              <view class="railSegment weak" :style="{ width: unknownSegmentWidth }" />
            </view>
            <view class="scoreLegend">
              <view class="legendRow mastered">
                <text class="legendName">已掌握</text>
                <text class="legendValue">{{ checkupSummary.mastered }}</text>
              </view>
              <view class="legendRow mid">
                <text class="legendName">会认不会写</text>
                <text class="legendValue">{{ checkupSummary.recognition }}</text>
              </view>
              <view class="legendRow weak">
                <text class="legendName">需补强</text>
                <text class="legendValue">{{ checkupSummary.unknown }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="weakList">
        <text class="blockTitle">本次生词</text>
        <view v-if="weakWords.length === 0" class="emptyState">
          <text>没有新增错词，可以直接进入下一 Unit。</text>
        </view>
        <view v-else>
          <view v-for="word in reportPreviewWeakWords" :key="word.id" class="weakRow">
            <text class="weakWord">{{ word.word }}</text>
            <text class="weakMeaning">{{ word.meaning }}</text>
          </view>
          <text v-if="reportHiddenWeakCount > 0" class="weakMoreText">还有 {{ reportHiddenWeakCount }} 个，已放入生词本</text>
        </view>
      </view>

      <view class="actionStack reportActions">
        <view class="bottomButton" @tap="openWeakbook">
          <text>查看生词本</text>
        </view>
        <view class="secondaryButton" @tap="startCheckup">
          <text>再测一轮</text>
        </view>
      </view>
    </view>

    <view v-else-if="screen === 'dictationSetup'" class="dictationSetupScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="backFromDictationSetup">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">自动听写</text>
      </view>

      <view class="dictationIntro">
        <text class="dictationIntroTitle">设置听写方式</text>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">报词内容</text>
        <view class="pillRow">
          <view :class="['pill', dictationPrompt === 'chinese' && 'isActive']" @tap="dictationPrompt = 'chinese'">
            <text>中文释义</text>
          </view>
          <view :class="['pill', dictationPrompt === 'english' && 'isActive']" @tap="dictationPrompt = 'english'">
            <text>英文单词</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">每词间隔</text>
        <view class="pillRow">
          <view :class="['pill', dictationIntervalSeconds === 5 && 'isActive']" @tap="dictationIntervalSeconds = 5">
            <text>5 秒</text>
          </view>
          <view :class="['pill', dictationIntervalSeconds === 8 && 'isActive']" @tap="dictationIntervalSeconds = 8">
            <text>8 秒</text>
          </view>
          <view :class="['pill', dictationIntervalSeconds === 12 && 'isActive']" @tap="dictationIntervalSeconds = 12">
            <text>12 秒</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">播放顺序</text>
        <view class="pillRow">
          <view :class="['pill', dictationOrder === 'sequence' && 'isActive']" @tap="dictationOrder = 'sequence'">
            <text>顺序</text>
          </view>
          <view :class="['pill', dictationOrder === 'shuffle' && 'isActive']" @tap="dictationOrder = 'shuffle'">
            <text>乱序</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">重复次数</text>
        <view class="pillRow">
          <view :class="['pill', dictationRepeatCount === 1 && 'isActive']" @tap="dictationRepeatCount = 1">
            <text>1 次</text>
          </view>
          <view :class="['pill', dictationRepeatCount === 2 && 'isActive']" @tap="dictationRepeatCount = 2">
            <text>2 次</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">听写方式</text>
        <view class="pillRow">
          <view :class="['pill', dictationMode === 'paper' && 'isActive']" @tap="dictationMode = 'paper'">
            <text>纸笔默写</text>
          </view>
          <view :class="['pill', dictationMode === 'online' && 'isActive']" @tap="dictationMode = 'online'">
            <text>在线输入</text>
          </view>
        </view>
      </view>

      <view class="dictationModeTip">
        <text>{{ dictationMode === 'paper' ? '手机负责报词，孩子继续用纸笔完成。' : '在线输入会记录对错并同步生词本。' }}</text>
      </view>

      <view class="dictationContentCard" @tap="openDictationWordPicker">
        <view>
          <text class="contentLabel">本次内容</text>
          <text class="contentTitle">{{ dictationSourceLabel }}</text>
          <text class="contentMeta">共 {{ targetDictationWords.length }} 个词，预计 {{ dictationSetupMinutes }}</text>
        </view>
        <text class="contentArrow">›</text>
      </view>

      <view :class="['dictationStartButton', selectedDictationWordCount === 0 && 'isDisabled']" @tap="beginDictation">
        <text>开始听写</text>
      </view>
    </view>

    <view v-else-if="screen === 'dictationWords'" class="dictationWordScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="backFromDictationWordPicker">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">选择单词</text>
      </view>

      <view class="wordPickerHeader">
        <text class="wordPickerTitle">{{ selectedUnit?.bookName }} Unit {{ selectedUnit?.unitNumber }}</text>
        <text class="wordPickerMeta">已选 {{ selectedDictationWordCount }} / {{ activeWords.length }} 个词</text>
      </view>

      <view class="wordPickerToolbar">
        <view class="miniPill" @tap="allDictationWordsSelected ? clearDictationWordSelection() : selectAllDictationWords()">
          <text>{{ allDictationWordsSelected ? '清空' : '全选' }}</text>
        </view>
        <view class="quickPickGroup">
          <view class="quickPickButton" @tap="quickSelectDictationWords(10)">
            <text>10词</text>
          </view>
          <view class="quickPickButton" @tap="quickSelectDictationWords(20)">
            <text>20词</text>
          </view>
          <view class="quickPickButton" @tap="quickSelectDictationWords(30)">
            <text>30词</text>
          </view>
        </view>
        <text class="wordPickerHint">默认全选，可任意组合</text>
      </view>

      <view class="wordPickerList">
        <view
          v-for="word in activeWords"
          :key="word.id"
          :class="['wordPickRow', isDictationWordSelected(word.id) && 'isSelected']"
          @tap="toggleDictationWordSelection(word.id)"
        >
          <view class="wordPickCheck">
            <text v-if="isDictationWordSelected(word.id)">✓</text>
          </view>
          <view class="wordPickCopy">
            <text class="wordPickWord">{{ word.word }}</text>
            <text class="wordPickMeaning">{{ word.meaning }}</text>
          </view>
          <text class="wordPickLevel">L{{ word.difficulty }}</text>
        </view>
      </view>

      <view :class="['dictationStartButton wordPickerConfirm', selectedDictationWordCount === 0 && 'isDisabled']" @tap="confirmDictationWordSelection">
        <text>确定 {{ selectedDictationWordCount }} 个词</text>
      </view>
    </view>

    <view v-else-if="screen === 'dictation' && currentDictationEntry" class="dictationPlayerScreen">
      <view class="playerHeader">
        <view class="playerHeaderTop">
          <view class="navBack" @tap="openDictationSetup">
            <view class="chevronLeft" />
          </view>
          <text class="playerTitle">自动听写</text>
          <text class="playerProgressText">{{ dictationProgressLabel }}</text>
        </view>
        <view class="playerProgressTrack">
          <view class="playerProgressFill" :style="{ width: dictationProgressPercent + '%' }" />
        </view>
      </view>

      <view class="playerStage">
        <text class="playerInstruction">请写下这个单词</text>
        <view :class="['speakerButton', isAudioPlaying && 'isPlaying', !dictationAudioReady && 'isMissing']" @tap="repeatCurrentDictation">
          <view class="speakerGlyph">
            <view class="speakerCore" />
            <view class="speakerCone" />
            <view class="speakerWave one" />
            <view class="speakerWave two" />
          </view>
        </view>
        <text class="spokenPrompt">{{ dictationSpokenPrompt }}</text>
        <view
          v-if="dictationPrompt === 'chinese'"
          :class="['forgotButton', currentDictationMarkedForgotten && 'isMarked']"
          @tap="markCurrentDictationForgotten"
        >
          <text>{{ currentDictationMarkedForgotten ? '已加入生词本' : '忘记了' }}</text>
        </view>
        <text class="autoNextText">{{ dictationTransportStatus }}</text>
        <view v-if="dictationMode === 'paper'" class="countdownTrack">
          <view class="countdownFill" :style="{ width: dictationCountdownPercent + '%' }" />
        </view>

        <view v-if="dictationMode === 'paper'" class="transportRow">
          <view class="transportButton" @tap="repeatCurrentDictation">
            <text class="transportIcon">↻</text>
            <text class="transportLabel">重复</text>
          </view>
          <view class="transportButton isPrimary" @tap="toggleDictationPause">
            <text class="transportIcon">{{ isAutoPaused ? '▶' : 'Ⅱ' }}</text>
            <text class="transportLabel">{{ isAutoPaused ? '继续' : '暂停' }}</text>
          </view>
          <view class="transportButton" @tap="skipCurrentDictation">
            <text class="transportIcon">▶|</text>
            <text class="transportLabel">跳过</text>
          </view>
        </view>
      </view>

      <view v-if="dictationMode === 'online'" class="onlineAnswerPanel">
        <input
          v-model="dictationInput"
          class="textInput"
          placeholder="输入英文单词"
          placeholder-class="inputPlaceholder"
          confirm-type="done"
          @confirm="submitDictationInput"
        />
        <view v-if="showDictationAnswer" :class="['answerBox', lastDictationCorrect ? 'success' : 'danger']">
          <text class="feedbackTitle">{{ lastDictationCorrect ? '拼对了' : '需要订正' }}</text>
          <text class="feedbackText">
            {{ currentDictationMarkedForgotten ? '已标记忘记：' : '' }}{{ currentDictationEntry.word }} / {{ currentDictationEntry.meaning }}
          </text>
        </view>
        <view
          v-if="!showDictationAnswer"
          :class="['dictationStartButton', !dictationInput.trim() && 'isDisabled']"
          @tap="submitDictationInput"
        >
          <text>提交</text>
        </view>
        <view v-else class="dictationStartButton" @tap="nextDictation">
          <text>{{ dictationIndex < dictationTotalCount - 1 ? '下一词' : '完成' }}</text>
        </view>
      </view>

      <view class="playerFootnote">
        <text>保持屏幕常亮。静音模式下仍可播放。</text>
      </view>
      <view class="exitDictationButton" @tap="exitDictation">
        <text>退出听写</text>
      </view>
    </view>

    <view v-else-if="screen === 'dictationReport'" class="sectionStack reportScreen">
      <view class="flowHeader dictationReportHeader">
        <view class="backButton" @tap="resetPractice">返回</view>
        <text class="dictationReportPageTitle">听写报告</text>
        <view class="reportHeaderSpacer" />
      </view>

      <view class="dictationSummaryCard">
        <view class="dictationSummaryCopy">
          <view class="summaryTitleRow">
            <text class="labelText">本次听写</text>
            <text class="summaryInlineMeta">{{ dictationSummary.total }} 词</text>
          </view>
          <text class="reportText">
            {{ dictationMode === 'paper' ? dictationPaperReportText : dictationReportText }}
          </text>
        </view>
        <view class="dictationSummaryStats">
          <view class="summaryStat">
            <text class="summaryStatValue">{{ dictationSummary.total }}</text>
            <text class="summaryStatLabel">完成</text>
          </view>
          <view class="summaryStat isProblem">
            <text class="summaryStatValue">{{ dictationSummary.forgotten }}</text>
            <text class="summaryStatLabel">忘记</text>
          </view>
        </view>
      </view>

      <view class="weakList dictationPriorityList">
        <text class="blockTitle">需重点记忆</text>
        <view v-if="dictationForgottenWords.length === 0 && dictationWrongWords.length === 0" class="emptyState">
          <text>没有标记忘记或拼写错误的单词。</text>
        </view>
        <view v-else>
          <view v-for="word in dictationPriorityWords" :key="word.id" class="dictationProblemRow">
            <text class="weakWord">{{ word.word }}</text>
            <text class="weakMeaning">{{ word.meaning }}</text>
          </view>
        </view>
      </view>

      <view class="weakList dictationReviewList">
        <text class="blockTitle">本次听写清单</text>
        <view>
          <view
            v-for="item in dictationReviewItems"
            :key="item.word.id"
            :class="['dictationReviewRow', item.isProblem && 'isProblem', item.status && 'hasStatus']"
          >
            <text class="reviewIndex">{{ item.index }}</text>
            <view class="reviewCopy">
              <text class="weakWord">{{ item.word.word }}</text>
              <text class="weakMeaning">{{ item.word.meaning }}</text>
            </view>
            <text v-if="item.status" class="reviewStatus">{{ item.status }}</text>
          </view>
        </view>
      </view>

      <view class="actionStack reportActions">
        <view class="bottomButton" @tap="startDictation">
          <text>再听一轮</text>
        </view>
        <view class="secondaryButton" @tap="openWeakbook">
          <text>查看生词本</text>
        </view>
      </view>
    </view>

    <view v-if="showBottomNav" class="bottomNav">
      <view class="bottomNavInner">
        <view :class="['bottomNavItem', screen === 'home' && 'isActive']" @tap="goHome">
          <text class="bottomNavLabel">首页</text>
        </view>
        <view :class="['bottomNavItem', screen === 'weakbook' && 'isActive']" @tap="goWeakbook">
          <text class="bottomNavLabel">生词本</text>
          <text v-if="savedWeakWords.length > 0" class="bottomNavBadge">{{ savedWeakWords.length }}</text>
        </view>
        <view :class="['bottomNavItem', screen === 'dictationSetup' && 'isActive']" @tap="goDictationSetup">
          <text class="bottomNavLabel">听写</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { usePracticeSession, type AppScreen } from '@/app/usePracticeSession'

const props = defineProps<{
  tabScreen?: 'home' | 'weakbook' | 'dictationSetup'
}>()

const choiceKeys = ['A', 'B', 'C', 'D']
const rewardParticles = [
  { id: 'p1', style: 'left: 49%; top: 52%; background: #f4c861; --tx: -118px; --ty: -126px; --fall: 18px; --scale: 1.15; --rot: -170deg; --delay: 0ms; --w: 8px; --h: 18px; --r: 6px;' },
  { id: 'p2', style: 'left: 51%; top: 52%; background: #147467; --tx: -78px; --ty: -154px; --fall: 24px; --scale: 0.9; --rot: 124deg; --delay: 26ms; --w: 10px; --h: 10px; --r: 999px;' },
  { id: 'p3', style: 'left: 50%; top: 52%; background: #2d6ed6; --tx: -30px; --ty: -166px; --fall: 20px; --scale: 1; --rot: -112deg; --delay: 48ms; --w: 7px; --h: 18px; --r: 6px;' },
  { id: 'p4', style: 'left: 50%; top: 52%; background: #f4c861; --tx: 18px; --ty: -174px; --fall: 22px; --scale: 0.88; --rot: 160deg; --delay: 18ms; --w: 12px; --h: 12px; --r: 999px;' },
  { id: 'p5', style: 'left: 50%; top: 52%; background: #147467; --tx: 70px; --ty: -150px; --fall: 24px; --scale: 1.05; --rot: 132deg; --delay: 38ms; --w: 8px; --h: 20px; --r: 6px;' },
  { id: 'p6', style: 'left: 50%; top: 52%; background: #d95b59; --tx: 118px; --ty: -112px; --fall: 28px; --scale: 0.95; --rot: 210deg; --delay: 58ms; --w: 11px; --h: 11px; --r: 999px;' },
  { id: 'p7', style: 'left: 50%; top: 52%; background: #2d6ed6; --tx: -122px; --ty: -64px; --fall: 32px; --scale: 1.05; --rot: -82deg; --delay: 72ms; --w: 8px; --h: 18px; --r: 6px;' },
  { id: 'p8', style: 'left: 50%; top: 52%; background: #f4c861; --tx: 124px; --ty: -56px; --fall: 34px; --scale: 1.1; --rot: 98deg; --delay: 84ms; --w: 9px; --h: 18px; --r: 6px;' },
  { id: 'p9', style: 'left: 50%; top: 52%; background: #147467; --tx: -48px; --ty: -92px; --fall: 26px; --scale: 0.78; --rot: -220deg; --delay: 96ms; --w: 9px; --h: 9px; --r: 999px;' },
  { id: 'p10', style: 'left: 50%; top: 52%; background: #2d6ed6; --tx: 44px; --ty: -96px; --fall: 26px; --scale: 0.82; --rot: 220deg; --delay: 108ms; --w: 9px; --h: 9px; --r: 999px;' }
]

const {
  activeWords,
  allDictationWordsSelected,
  allWeakWordsSelected,
  backFromDictationSetup,
  backFromDictationWordPicker,
  bookOptions,
  checkupIndex,
  checkupLimitOptions,
  checkupProgressLabel,
  checkupQuestions,
  checkupSummary,
  clearDictationWordSelection,
  clearWeakWordSelection,
  confirmDictationWordSelection,
  currentCheckupQuestion,
  currentDictationEntry,
  dictationAudioReady,
  dictationAudioUrl,
  dictationIndex,
  dictationInput,
  dictationIntervalSeconds,
  dictationMode,
  dictationOrder,
  dictationPlan,
  dictationProgressLabel,
  dictationPrompt,
  dictationRecords,
  dictationRepeatCount,
  dictationSummary,
  dictationTitle,
  dictationForgottenWords,
  dictationWrongWords,
  effectiveCheckupLimit,
  isUnitWordMastered,
  markSelectedWeakWordsKnown,
  markCurrentDictationForgotten,
  markUnitWordKnown,
  openDictationWordPicker,
  openCheckupSetup,
  nextAfterWrong,
  openDictationSetup: openDictationSetupScreen,
  openSelectedWeakDictationSetup,
  openUnitWords,
  openWeakbook: openWeakbookScreen,
  publisherOptions,
  quickSelectDictationWords,
  recognitionState,
  resetPractice: resetPracticeScreen,
  screen,
  selectMeaning,
  selectAllDictationWords,
  selectAllWeakWords,
  selectedMeaning,
  selectedBookIndex,
  selectedPublisherIndex,
  selectedSchoolStageIndex,
  selectedUnit,
  selectedUnitIndex,
  selectedUnitQuickIndex,
  selectedDictationWordCount,
  selectedDictationWordIds,
  selectedWeakWordCount,
  selectedWeakWordIds,
  schoolStageOptions,
  savedWeakWords,
  setCheckupLimit,
  setSelectedBookByIndex,
  setSelectedPublisherByIndex,
  setSelectedSchoolStageByIndex,
  setSelectedUnitByIndex,
  setSelectedUnitQuickByIndex,
  showDictationAnswer,
  spellingInput,
  startCheckup,
  startSelectedWeakCheckup,
  startDictation,
  submitDictationInput,
  submitSpelling,
  targetDictationWords,
  toggleDictationWordSelection,
  toggleWeakWordSelection,
  unitQuickOptions,
  unitLabel,
  unitMasteryLabel,
  unitMasteryPercent,
  unitOptions,
  unitWordCount,
  unitWords,
  weakWords,
  nextDictation
} = usePracticeSession()

let activeAudio: UniApp.InnerAudioContext | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null
let queuedPlaybackTimer: ReturnType<typeof setTimeout> | null = null
let audioRepeatsLeft = 0
let audioErrorShouldToast = false
let lastPlaybackKey = ''
const isAudioPlaying = ref(false)
const isAutoPaused = ref(false)
const remainingSeconds = ref(0)
const checkupLimitDraft = ref('')
const checkupLimitInputFocused = ref(false)
const shellVisible = ref(false)

const TAB_ROOT_SCREENS = new Set<AppScreen>(['home', 'weakbook', 'dictationSetup'])

function getProgressPercent(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)))
}

const checkupProgressPercent = computed(() => {
  return getProgressPercent(checkupIndex.value + 1, checkupQuestions.value.length)
})

const dictationProgressPercent = computed(() => {
  return getProgressPercent(dictationIndex.value + 1, dictationPlan.value?.words.length ?? 0)
})

const dictationTotalCount = computed(() => dictationPlan.value?.words.length ?? 0)

const displayedCheckupLimit = computed(() => {
  const draft = checkupLimitDraft.value.trim()
  if (!draft) return 0

  const limit = Number(draft)
  if (!Number.isFinite(limit) || limit <= 0) return 0

  return Math.min(activeWords.value.length, Math.max(1, Math.round(limit)))
})

const checkupEstimateMinutes = computed(() => {
  if (displayedCheckupLimit.value <= 0) return 0
  return Math.max(1, Math.ceil(displayedCheckupLimit.value / 4))
})

const wrongNextLabel = computed(() => {
  return checkupIndex.value < checkupQuestions.value.length - 1 ? '下一词' : '看报告'
})

const reportPreviewWeakWords = computed(() => weakWords.value.slice(0, 3))

const reportHiddenWeakCount = computed(() => Math.max(0, weakWords.value.length - reportPreviewWeakWords.value.length))

function getSegmentWidth(count: number, total: number): string {
  if (total <= 0 || count <= 0) return '0%'
  return `${Math.max(3, Math.round((count / total) * 100))}%`
}

const masteredSegmentWidth = computed(() => {
  const total = checkupSummary.value.total
  return getSegmentWidth(checkupSummary.value.mastered, total)
})

const recognitionSegmentWidth = computed(() => {
  const total = checkupSummary.value.total
  return getSegmentWidth(checkupSummary.value.recognition, total)
})

const unknownSegmentWidth = computed(() => {
  const total = checkupSummary.value.total
  return getSegmentWidth(checkupSummary.value.unknown, total)
})

const lastDictationCorrect = computed(() => {
  const last = dictationRecords.value[dictationRecords.value.length - 1]
  return last?.correct ?? true
})

const dictationRecordMap = computed(() => {
  return new Map(dictationRecords.value.map(record => [record.wordId, record]))
})

const currentDictationMarkedForgotten = computed(() => {
  const id = currentDictationEntry.value?.id
  if (!id) return false

  return dictationRecordMap.value.get(id)?.forgotten === true
})

const dictationPriorityWords = computed(() => {
  const problemIds = new Set(dictationRecords.value
    .filter(record => !record.correct || record.forgotten)
    .map(record => record.wordId))

  return (dictationPlan.value?.words ?? []).filter(word => problemIds.has(word.id))
})

const dictationReviewItems = computed(() => {
  return (dictationPlan.value?.words ?? []).map((word, index) => {
    const record = dictationRecordMap.value.get(word.id)
    const forgotten = record?.forgotten === true
    const wrong = Boolean(record && !record.correct)

    return {
      word,
      index: String(index + 1).padStart(2, '0'),
      isProblem: forgotten || wrong,
      status: forgotten || wrong ? '忘记' : ''
    }
  })
})

const dictationReportText = computed(() => {
  if (dictationSummary.value.wrong === 0) return '全部拼对，清单可用于复盘。'
  if (dictationSummary.value.forgotten > 0) {
    return `已标记 ${dictationSummary.value.forgotten} 个忘记，已加入生词本。`
  }
  return `有 ${dictationSummary.value.wrong} 个需重点记忆，已加入生词本。`
})

const dictationPaperReportText = computed(() => {
  if (dictationSummary.value.forgotten > 0) {
    return `已标记 ${dictationSummary.value.forgotten} 个忘记，已加入生词本。`
  }

  return '按下方清单逐词核对。'
})

const dictationSetupMinutes = computed(() => {
  const seconds = targetDictationWords.value.length * dictationIntervalSeconds.value * dictationRepeatCount.value
  return `${Math.max(1, Math.ceil(seconds / 60))} 分钟`
})

const dictationSourceLabel = computed(() => {
  if (targetDictationWords.value.length === activeWords.value.length) return unitLabel.value
  return `${selectedUnit.value?.bookName ?? '本单元'} Unit ${selectedUnit.value?.unitNumber ?? ''} 自选词`
})

const dictationSpokenPrompt = computed(() => {
  if (!currentDictationEntry.value) return ''
  return dictationPrompt.value === 'chinese' ? currentDictationEntry.value.meaning : '英文单词发音'
})

const dictationTransportStatus = computed(() => {
  if (!dictationAudioReady.value) return '音频待生成'
  if (dictationMode.value === 'online') return '输入后提交判定'
  if (isAutoPaused.value) return '已暂停'
  return `${remainingSeconds.value} 秒后自动进入下一个`
})

const dictationCountdownPercent = computed(() => {
  const total = dictationPlan.value?.intervalSeconds ?? dictationIntervalSeconds.value
  if (total <= 0) return 0
  return Math.round((remainingSeconds.value / total) * 100)
})

const showBottomNav = computed(() => {
  return false
})

const showAppHeader = computed(() => {
  return false
})

function onUnitChange(event: { detail: { value: number | string } }) {
  setSelectedUnitByIndex(Number(event.detail.value))
}

function onSchoolStageChange(event: { detail: { value: number | string } }) {
  setSelectedSchoolStageByIndex(Number(event.detail.value))
}

function onPublisherChange(event: { detail: { value: number | string } }) {
  setSelectedPublisherByIndex(Number(event.detail.value))
}

function onBookChange(event: { detail: { value: number | string } }) {
  setSelectedBookByIndex(Number(event.detail.value))
}

function onUnitQuickChange(event: { detail: { value: number | string } }) {
  setSelectedUnitQuickByIndex(Number(event.detail.value))
}

function onCheckupLimitInput(event: Event) {
  const miniProgramValue = (event as unknown as { detail?: { value?: string | number } }).detail?.value
  const webValue = (event.target as HTMLInputElement | null)?.value
  checkupLimitDraft.value = String(miniProgramValue ?? webValue ?? '').replace(/[^\d]/g, '')
}

function onCheckupLimitFocus() {
  checkupLimitInputFocused.value = true
}

function commitCheckupLimitDraft() {
  checkupLimitInputFocused.value = false

  const draft = checkupLimitDraft.value.trim()
  if (!draft) {
    setCheckupLimit(0)
    checkupLimitDraft.value = String(effectiveCheckupLimit.value)
    return
  }

  setCheckupLimit(Number(draft))
  checkupLimitDraft.value = String(effectiveCheckupLimit.value)
}

function startCheckupFromSetup() {
  commitCheckupLimitDraft()
  startCheckup()
}

function applyCheckupLimitOption(limit: number) {
  setCheckupLimit(limit)
  checkupLimitDraft.value = String(effectiveCheckupLimit.value)
}

function isCheckupLimitOptionActive(limit: number): boolean {
  return displayedCheckupLimit.value === limit
}

function getCheckupLimitOptionLabel(limit: number): string {
  return limit === activeWords.value.length ? '全部' : `${limit}题`
}

function syncNativeTabBar() {
  try {
    if (TAB_ROOT_SCREENS.has(screen.value)) {
      uni.showTabBar({ animation: false })
    } else {
      uni.hideTabBar({ animation: false })
    }
  } catch {
    // H5 preview and some test runtimes may not expose native tabBar controls.
  }
}

function switchNativeTab(url: string) {
  try {
    uni.switchTab({ url })
  } catch {
    // The internal screen has already changed; this only keeps native tab state aligned.
  }
}

function activateTabRoot() {
  if (props.tabScreen === 'home') {
    resetPracticeScreen()
  } else if (props.tabScreen === 'weakbook') {
    openWeakbookScreen()
  } else if (props.tabScreen === 'dictationSetup') {
    openDictationSetupScreen()
  }

  syncNativeTabBar()
}

function resetPractice() {
  resetPracticeScreen()
  switchNativeTab('/pages/index/index')
}

function openWeakbook() {
  openWeakbookScreen()
  switchNativeTab('/pages/weakbook/index')
}

function openDictationSetup() {
  openDictationSetupScreen()
  switchNativeTab('/pages/dictation/index')
}

function goHome() {
  resetPractice()
}

function goWeakbook() {
  openWeakbook()
}

function goDictationSetup() {
  openDictationSetup()
}

function isWeakWordSelected(wordId: string): boolean {
  return selectedWeakWordIds.value.includes(wordId)
}

function isDictationWordSelected(wordId: string): boolean {
  return selectedDictationWordIds.value.includes(wordId)
}

function beginDictation() {
  lastPlaybackKey = ''
  startDictation()
  if (screen.value === 'dictation') {
    clearDictationTimers()
    startCurrentDictationPlayback()
  }
}

function isCorrectSelected(choice: string): boolean {
  return recognitionState.value === 'correct' && selectedMeaning.value === choice
}

function isWrongSelected(choice: string): boolean {
  return recognitionState.value === 'wrong' && selectedMeaning.value === choice
}

function getChoiceClass(choice: string): Array<string | false> {
  const correctMeaning = currentCheckupQuestion.value?.word.meaning
  return [
    'choiceItem',
    recognitionState.value !== 'idle' && 'isLocked',
    isCorrectSelected(choice) && 'isCorrect',
    isWrongSelected(choice) && 'isWrong',
    recognitionState.value === 'wrong' && choice === correctMeaning && 'isCorrectAnswer'
  ]
}

function clearDictationTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (queuedPlaybackTimer) {
    clearTimeout(queuedPlaybackTimer)
    queuedPlaybackTimer = null
  }
}

function getCurrentPlaybackKey(): string {
  if (screen.value !== 'dictation' || !currentDictationEntry.value || !dictationAudioUrl.value) return ''
  return `${currentDictationEntry.value.id}|${dictationAudioUrl.value}|${dictationMode.value}`
}

function stopActiveAudio() {
  if (!activeAudio) return
  activeAudio.stop()
  isAudioPlaying.value = false
}

function destroyActiveAudio() {
  if (!activeAudio) return
  activeAudio.stop()
  activeAudio.destroy()
  activeAudio = null
  audioRepeatsLeft = 0
  isAudioPlaying.value = false
}

function ensureAudioContext(showToast: boolean) {
  if (activeAudio) return activeAudio

  activeAudio = uni.createInnerAudioContext()
  activeAudio.autoplay = false
  activeAudio.onPlay(() => {
    isAudioPlaying.value = true
  })
  activeAudio.onEnded(() => {
    audioRepeatsLeft -= 1
    if (audioRepeatsLeft > 0 && activeAudio) {
      setTimeout(() => {
        try {
          activeAudio?.seek(0)
          activeAudio?.play()
        } catch {
          isAudioPlaying.value = false
        }
      }, 180)
      return
    }
    audioRepeatsLeft = 0
    isAudioPlaying.value = false
  })
  activeAudio.onStop(() => {
    isAudioPlaying.value = false
  })
  activeAudio.onError(() => {
    isAudioPlaying.value = false
    if (audioErrorShouldToast) {
      uni.showToast({
        title: '音频播放失败',
        icon: 'none'
      })
    }
  })

  return activeAudio
}

function playCurrentAudio(showToast = true, repeatTimes = 1) {
  const url = dictationAudioUrl.value
  if (!dictationAudioReady.value || !url) {
    if (showToast) {
      uni.showToast({
        title: '音频待生成',
        icon: 'none'
      })
    }
    return
  }

  const audio = ensureAudioContext(showToast)
  audioRepeatsLeft = Math.max(1, repeatTimes)
  audioErrorShouldToast = showToast
  audio.stop()
  audio.src = url
  try {
    audio.seek(0)
  } catch {
    // Some H5 runtimes only allow seek after metadata is ready.
  }
  audio.play()
}

function startPaperCountdown() {
  clearDictationTimers()
  if (dictationMode.value !== 'paper' || screen.value !== 'dictation') return

  remainingSeconds.value = dictationPlan.value?.intervalSeconds ?? dictationIntervalSeconds.value
  countdownTimer = setInterval(() => {
    if (isAutoPaused.value) return
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)

    if (remainingSeconds.value > 0) return

    clearDictationTimers()
    nextDictation()
    if (screen.value === 'dictation') {
      startCurrentDictationPlayback()
    }
  }, 1000)
}

function startCurrentDictationPlayback() {
  if (!currentDictationEntry.value || !dictationAudioReady.value) return

  lastPlaybackKey = getCurrentPlaybackKey()

  if (dictationMode.value === 'paper') {
    isAutoPaused.value = false
    playCurrentAudio(false, dictationPlan.value?.repeatCount ?? dictationRepeatCount.value)
    startPaperCountdown()
    return
  }

  playCurrentAudio(false)
}

function repeatCurrentDictation() {
  playCurrentAudio(true, dictationPlan.value?.repeatCount ?? dictationRepeatCount.value)
  if (dictationMode.value === 'paper') {
    startPaperCountdown()
  }
}

function toggleDictationPause() {
  if (dictationMode.value !== 'paper') return

  isAutoPaused.value = !isAutoPaused.value
  if (isAutoPaused.value) {
    stopActiveAudio()
    return
  }

  playCurrentAudio(false, dictationPlan.value?.repeatCount ?? dictationRepeatCount.value)
}

function skipCurrentDictation() {
  clearDictationTimers()
  stopActiveAudio()
  nextDictation()
  if (screen.value === 'dictation') {
    startCurrentDictationPlayback()
  }
}

function exitDictation() {
  clearDictationTimers()
  stopActiveAudio()
  openDictationSetup()
}

watch(
  () => [screen.value, effectiveCheckupLimit.value],
  () => {
    if (screen.value !== 'checkupSetup' || checkupLimitInputFocused.value) return

    checkupLimitDraft.value = String(effectiveCheckupLimit.value)
  },
  { immediate: true }
)

watch(
  () => screen.value,
  () => {
    syncNativeTabBar()
  },
  { immediate: true }
)

watch(
  () => [shellVisible.value, screen.value, currentDictationEntry.value?.id, dictationAudioUrl.value, dictationAudioReady.value, dictationMode.value],
  () => {
    if (!shellVisible.value) {
      clearDictationTimers()
      destroyActiveAudio()
      return
    }

    if (screen.value !== 'dictation') {
      clearDictationTimers()
      destroyActiveAudio()
      lastPlaybackKey = ''
      return
    }

    if (!currentDictationEntry.value || !dictationAudioReady.value) {
      clearDictationTimers()
      return
    }

    const playbackKey = getCurrentPlaybackKey()
    if (playbackKey && playbackKey === lastPlaybackKey) return

    clearDictationTimers()

    queuedPlaybackTimer = setTimeout(() => {
      if (screen.value === 'dictation' && currentDictationEntry.value && dictationAudioReady.value) {
        startCurrentDictationPlayback()
      }
    }, 240)
  }
)

onShow(() => {
  shellVisible.value = true
  if (TAB_ROOT_SCREENS.has(screen.value)) {
    activateTabRoot()
  } else {
    syncNativeTabBar()
  }
})

onHide(() => {
  shellVisible.value = false
  clearDictationTimers()
  destroyActiveAudio()
})

onBeforeUnmount(() => {
  clearDictationTimers()
  destroyActiveAudio()
  try {
    uni.showTabBar({ animation: false })
  } catch {
    // Ignore non-tab preview runtimes.
  }
})
</script>

<style lang="scss">
.screen {
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(16px + env(safe-area-inset-top)) 18px calc(26px + env(safe-area-inset-bottom));
  background: #fff;
}

.screen.hasBottomNav {
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}

.appHeader,
.flowHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 50px;
  margin-bottom: 12px;
}

.appHeader {
  padding: 2px 0 10px;
}

.brand,
.tagline,
.navTitle,
.dictationIntroTitle,
.dictationIntroText,
.settingLabel,
.contentLabel,
.contentTitle,
.contentMeta,
.playerTitle,
.playerProgressText,
.playerInstruction,
.spokenPrompt,
.autoNextText,
.transportLabel,
.playerFootnote,
.exitDictationButton,
.labelText,
.heroTitle,
.practiceType,
.practiceTitle,
.practiceDesc,
.blockTitle,
.wordTitle,
.phonetic,
.choiceKey,
.choiceText,
.choiceResult,
.feedbackTitle,
.feedbackText,
.wrongActionTitle,
.wrongActionText,
.inlineNextButton,
.meaningTitle,
.fieldLabel,
.reportScore,
.reportText,
.scoreBadgeLabel,
.legendName,
.legendValue,
.toolbarText,
.smallButton,
.dangerButton,
.bottomNavLabel,
.bottomNavBadge,
.setupTitle,
.setupText,
.controlLabel,
.dictationHint,
.audioButtonMain,
.audioButtonSub,
.weakWord,
.weakMeaning {
  display: block;
}

.brand {
  font-size: 24px;
  line-height: 1.05;
  font-weight: 950;
  color: #0d0f0e;
  letter-spacing: 0;
}

.tagline {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.2;
  color: #8e9097;
  font-weight: 750;
}

.headerMark {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 36px;
  border: 1px solid #e1e4e8;
  border-radius: 14px;
  color: #0d0f0e;
  background: #fff;
  font-size: 13px;
  font-weight: 900;
}

.sectionStack,
.flowScreen {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.heroBlock,
.questionPanel,
.spellPanel,
.reportHero,
.setupHero,
.dictationPanel,
.weakList,
.weakbookHero,
.weakbookPanel {
  border: 0;
  border-radius: 18px;
  background: #f6f6f8;
  box-shadow: none;
}

.heroBlock {
  padding: 16px;
}

.labelText,
.controlLabel,
.blockTitle,
.fieldLabel {
  font-size: 14px;
  line-height: 1.2;
  font-weight: 850;
  color: #8e9097;
}

.heroTitle {
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.12;
  font-weight: 850;
  color: #0d0f0e;
  letter-spacing: 0;
}

.heroMeta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.heroMeta text {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 12px;
  background: #fff;
  color: #0d0f0e;
  font-size: 13px;
  font-weight: 700;
}

.unitPicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  margin-top: 10px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: #fff;
}

.unitPickerText {
  color: var(--muted);
  font-size: 13px;
}

.unitPickerValue {
  flex: 1;
  text-align: right;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
}

.practiceList {
  display: grid;
  gap: 10px;
}

.practiceItem {
  display: grid;
  grid-template-columns: 1fr 72px;
  gap: 12px;
  min-height: 118px;
  padding: 16px;
  border: 0;
  border-radius: 18px;
  background: #0a84ff;
  box-shadow: none;
  transition: transform 160ms ease, border-color 160ms ease;
}

.practiceItem:active,
.bottomButton:active,
.secondaryButton:active,
.dangerButton:active,
.bottomNavItem:active,
.smallButton:active,
.selectWordRow:active,
.segment:active,
.choiceItem:active,
.audioButton:active,
.inlineNextButton:active {
  transform: translateY(1px) scale(0.99);
}

.practiceItem.isPrimary {
  background: #0a84ff;
}

.practiceItem:not(.isPrimary) {
  background: #0d0f0e;
}

.practiceCopy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.practiceType {
  width: fit-content;
  min-width: 48px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.practiceType.blue {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.practiceTitle {
  margin-top: 8px;
  font-size: 23px;
  line-height: 1.08;
  font-weight: 850;
  color: #fff;
}

.practiceDesc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.82);
}

.practiceAction {
  align-self: end;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 40px;
  border-radius: 14px;
  background: #fff;
  color: #0a84ff;
  font-size: 15px;
  font-weight: 900;
}

.practiceAction.dark {
  background: #fff;
  color: #0d0f0e;
}

.bottomNav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  padding: 8px 14px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(195, 215, 209, 0.86);
  background: rgba(248, 251, 249, 0.92);
  backdrop-filter: blur(14px);
}

.bottomNavInner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 394px;
}

.bottomNavItem {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 14px;
  color: var(--muted);
  background: transparent;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.bottomNavItem.isActive {
  border-color: rgba(20, 116, 103, 0.24);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.bottomNavLabel {
  font-size: 13px;
  line-height: 1;
  font-weight: 900;
}

.bottomNavBadge {
  position: absolute;
  top: 4px;
  right: 13px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger);
  color: white;
  font-size: 10px;
  line-height: 18px;
  font-weight: 900;
  text-align: center;
}

.weakList {
  padding: 16px;
}

.weakbookHero,
.weakbookPanel {
  padding: 18px;
}

.weakbookPanel {
  display: grid;
  gap: 14px;
}

.weakbookToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.smallButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  height: 36px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: #fbfdfc;
  color: var(--accent);
  font-size: 13px;
  font-weight: 900;
}

.toolbarText {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 800;
}

.weakbookActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.weakbookActions .dangerButton {
  grid-column: 1 / -1;
}

.dangerButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  border: 1px solid #efb2b2;
  border-radius: var(--radius);
  background: var(--danger-soft);
  color: var(--danger);
  white-space: nowrap;
  font-size: 16px;
  font-weight: 900;
  transition: transform 160ms ease, opacity 160ms ease;
}

.selectWordList {
  display: grid;
  gap: 10px;
}

.selectWordRow {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  align-items: center;
  min-height: 62px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fbfdfc;
}

.selectWordRow.isSelected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.selectDot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: white;
  font-size: 15px;
  font-weight: 900;
}

.selectWordRow.isSelected .selectDot {
  border-color: var(--accent);
  background: var(--accent);
}

.selectWordCopy {
  min-width: 0;
}

.weakRow {
  display: grid;
  grid-template-columns: minmax(110px, 0.7fr) 1fr;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid var(--line);
}

.weakRow:last-child {
  border-bottom: 0;
}

.weakMoreText {
  display: block;
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.3;
  font-weight: 800;
}

.weakWord {
  color: var(--ink);
  font-size: 16px;
  font-weight: 850;
}

.weakMeaning {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.backButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: transparent;
  font-size: 0;
}

.backButton::before {
  content: "";
  width: 15px;
  height: 15px;
  border-left: 4px solid #0a84ff;
  border-bottom: 4px solid #0a84ff;
  transform: rotate(45deg);
}

.flowTitle {
  flex: 1;
  min-width: 0;
  text-align: right;
}

.progressHeader {
  align-items: center;
}

.flowProgress {
  flex: 1;
  display: grid;
  gap: 9px;
  min-width: 0;
}

.progressTopline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.flowTitleText {
  display: block;
  color: #0d0f0e;
  font-size: 17px;
  font-weight: 900;
}

.flowMeta {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.progressTrack {
  width: 100%;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8e8ed;
}

.progressFill {
  height: 100%;
  border-radius: 999px;
  background: #0d0f0e;
  transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.questionPanel,
.spellPanel,
.dictationPanel {
  position: relative;
  padding: 18px;
  overflow: hidden;
}

.wordTitle {
  margin-top: 26px;
  font-size: 48px;
  line-height: 1;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: 0;
}

.phonetic {
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.3;
  color: var(--muted);
  font-weight: 650;
}

.wrongActionBar {
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: 12px;
  align-items: center;
  margin-top: 18px;
  padding: 12px;
  border: 1px solid #f0b8b8;
  border-radius: var(--radius);
  background: linear-gradient(180deg, #fff4f4, #fdeceb);
}

.wrongActionCopy {
  min-width: 0;
}

.wrongActionTitle {
  color: var(--danger);
  font-size: 15px;
  line-height: 1.2;
  font-weight: 900;
}

.wrongActionText {
  margin-top: 5px;
  overflow: hidden;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.35;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inlineNextButton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: var(--radius);
  background: var(--danger);
  color: white;
  font-size: 15px;
  font-weight: 900;
}

.choiceList {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.choiceItem {
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  gap: 12px;
  align-items: center;
  min-height: 70px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fbfdfc;
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.choiceItem.isLocked {
  opacity: 0.46;
}

.choiceItem.isCorrect,
.choiceItem.isCorrectAnswer {
  opacity: 1;
  border-color: var(--accent);
  background: var(--accent-soft);
}

.choiceItem.isCorrect {
  animation: answerPop 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  box-shadow: 0 14px 28px rgba(20, 116, 103, 0.14);
}

.choiceItem.isWrong {
  opacity: 1;
  border-color: var(--danger);
  background: var(--danger-soft);
}

.choiceKey {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--accent);
  font-size: 15px;
  font-weight: 900;
}

.choiceItem.isWrong .choiceKey {
  background: var(--danger);
  color: white;
}

.choiceItem.isCorrect .choiceKey,
.choiceItem.isCorrectAnswer .choiceKey {
  background: var(--accent);
  color: white;
}

.choiceText {
  color: var(--ink);
  font-size: 18px;
  line-height: 1.35;
  font-weight: 850;
}

.choiceResult {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  font-size: 15px;
  font-weight: 900;
}

.choiceResult.wrong {
  background: var(--danger);
}

.celebrationLayer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.celebrationLayer::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 52%;
  width: 152px;
  height: 152px;
  border: 1px solid rgba(20, 116, 103, 0.24);
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(0.5);
  box-shadow: inset 0 0 0 16px rgba(20, 116, 103, 0.05);
  animation: successRing 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.rewardParticle {
  position: absolute;
  width: var(--w);
  height: var(--h);
  border-radius: var(--r);
  opacity: 0;
  box-shadow: 0 4px 10px rgba(16, 25, 23, 0.16);
  transform: translate(-50%, -50%);
  animation: rewardPop 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--delay, 0ms);
}

.feedbackBox,
.answerBox,
.infoStrip,
.emptyState {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.infoStrip {
  padding: 12px;
}

.feedbackBox.success,
.answerBox.success {
  border-color: #9dd7ba;
  background: var(--success-soft);
}

.feedbackBox.danger,
.answerBox.danger {
  border-color: #efb2b2;
  background: var(--danger-soft);
}

.feedbackTitle {
  color: var(--ink);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 900;
}

.feedbackText,
.infoStrip,
.emptyState {
  margin-top: 5px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
  font-weight: 650;
}

.meaningTitle {
  margin-top: 28px;
  color: var(--ink);
  font-size: 34px;
  line-height: 1.2;
  font-weight: 900;
}

.fieldGroup {
  display: grid;
  gap: 8px;
}

.textInput {
  width: 100%;
  height: 58px;
  padding: 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: #fbfdfc;
  color: var(--ink);
  font-size: 20px;
  font-weight: 750;
}

.inputPlaceholder {
  color: var(--muted-light);
  font-weight: 650;
}

.bottomButton,
.secondaryButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  border-radius: var(--radius);
  white-space: nowrap;
  font-size: 17px;
  font-weight: 900;
  transition: transform 160ms ease, opacity 160ms ease;
}

.bottomButton {
  background: var(--accent);
  color: white;
}

.secondaryButton {
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--info);
}

.bottomButton.isDisabled {
  pointer-events: none;
  background: #d9e3df;
  color: #7c8b86;
}

.secondaryButton.isDisabled,
.dangerButton.isDisabled {
  pointer-events: none;
  opacity: 0.48;
}

.reportScreen {
  padding-bottom: 128px;
}

.reportActions {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 30;
  display: grid;
  gap: 6px;
  width: calc(100% - 48px);
  max-width: 382px;
  padding-top: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff 28%);
  transform: translateX(-50%);
}

.reportActions .bottomButton {
  height: 56px;
  border-radius: 16px;
  background: #0a84ff;
  box-shadow: 0 12px 28px rgba(10, 132, 255, 0.22);
}

.reportActions .secondaryButton {
  height: 30px;
  border: 0;
  background: transparent;
  color: #0a84ff;
  font-size: 14px;
}

.checkupSetupScreen,
.dictationSetupScreen,
.dictationWordScreen,
.dictationPlayerScreen {
  min-height: 100vh;
  min-height: 100dvh;
  margin: calc(-16px - env(safe-area-inset-top)) -18px calc(-26px - env(safe-area-inset-bottom));
  padding: calc(14px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
  background: #fff;
  color: #0d0f0e;
}

.checkupSetupScreen,
.dictationSetupScreen {
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
}

.dictationNav,
.playerHeaderTop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}

.navBack {
  position: absolute;
  left: -4px;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  transform: translateY(-50%);
}

.chevronLeft {
  width: 16px;
  height: 16px;
  border-left: 4px solid #0a84ff;
  border-bottom: 4px solid #0a84ff;
  transform: rotate(45deg);
}

.navTitle,
.playerTitle {
  color: #0d0f0e;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 900;
}

.dictationIntro {
  margin-top: 10px;
}

.dictationIntroTitle {
  font-size: 27px;
  line-height: 1.12;
  font-weight: 950;
  letter-spacing: 0;
}

.dictationIntroText {
  margin-top: 4px;
  color: #9a9ca2;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 750;
}

.settingGroup {
  margin-top: 14px;
}

.dictationSetupScreen .settingGroup {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.settingLabel {
  margin-bottom: 8px;
  color: #8d8f96;
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
}

.dictationSetupScreen .settingLabel {
  margin-bottom: 0;
}

.pillRow {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.dictationSetupScreen .pillRow {
  justify-content: flex-start;
  gap: 8px;
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 62px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: #f3f3f6;
  color: #9a9ca2;
  font-size: 14px;
  font-weight: 900;
}

.dictationSetupScreen .pill {
  min-width: 58px;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.pill.isActive {
  background: #0d0f0e;
  color: #fff;
}

.dictationContentCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding: 13px 15px;
  border-radius: 18px;
  background: #f6f6f8;
}

.dictationContentCard:active {
  transform: translateY(1px) scale(0.99);
}

.contentLabel {
  color: #b0b2b8;
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
}

.contentTitle {
  margin-top: 8px;
  color: #0d0f0e;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 950;
}

.contentMeta {
  margin-top: 5px;
  color: #9a9ca2;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 750;
}

.contentArrow {
  color: #a5a7ad;
  font-size: 34px;
  line-height: 1;
  font-weight: 500;
}

.dictationTip {
  margin-top: 10px;
  padding: 10px 13px;
  border-radius: 16px;
  background: #eef8ff;
  color: #0a84ff;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 850;
}

.dictationStartButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 58px;
  margin-top: 14px;
  border-radius: 16px;
  background: #0a84ff;
  color: #fff;
  font-size: 18px;
  font-weight: 950;
}

.dictationSetupScreen > .dictationStartButton {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 30;
  width: calc(100% - 48px);
  max-width: 382px;
  margin-top: 0;
  transform: translateX(-50%);
  box-shadow: 0 12px 28px rgba(10, 132, 255, 0.22);
}

.checkupSetupScreen > .dictationStartButton {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 30;
  width: calc(100% - 48px);
  max-width: 382px;
  margin-top: 0;
  transform: translateX(-50%);
  box-shadow: 0 12px 28px rgba(10, 132, 255, 0.22);
}

.checkupIntro {
  margin-top: 26px;
}

.checkupStatGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 22px;
}

.checkupStat {
  min-height: 76px;
  padding: 14px 8px;
  border-radius: 16px;
  background: #f6f6f8;
  text-align: center;
}

.checkupStatValue {
  display: block;
  color: #0d0f0e;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}

.checkupStatLabel {
  display: block;
  margin-top: 8px;
  color: #8e9097;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 850;
}

.checkupLimitInput {
  display: block;
  width: 100%;
  height: 26px;
  color: #0d0f0e;
  text-align: center;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}

.checkupLimitShell {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.checkupLimitSuffix,
.checkupEditHint {
  display: block;
}

.checkupLimitSuffix {
  color: #1cb0f6;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

.checkupEditHint {
  margin-top: 4px;
  color: #1cb0f6;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
}

.checkupLimitOptions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.checkupLimitOption {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 999px;
  background: #fff;
  color: #777;
  font-size: 13px;
  font-weight: 950;
}

.checkupLimitOption.isActive {
  border-color: var(--accent-strong);
  background: var(--accent);
  color: #fff;
}

.checkupSteps {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.checkupStep {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
  min-height: 58px;
}

.stepIndex {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #0d0f0e;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
}

.stepTitle {
  display: block;
  color: #0d0f0e;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 950;
}

.stepText {
  display: block;
  margin-top: 3px;
  color: #8e9097;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 750;
}

.wordPickerHeader {
  margin-top: 18px;
}

.wordPickerTitle {
  display: block;
  color: #0d0f0e;
  font-size: 26px;
  line-height: 1.16;
  font-weight: 950;
}

.wordPickerMeta {
  display: block;
  margin-top: 6px;
  color: #9a9ca2;
  font-size: 14px;
  line-height: 1.25;
  font-weight: 800;
}

.wordPickerToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.miniPill {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: #0d0f0e;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.wordPickerHint {
  color: #9a9ca2;
  font-size: 13px;
  font-weight: 800;
}

.wordPickerList {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding-bottom: 86px;
}

.wordPickRow {
  display: grid;
  grid-template-columns: 30px 1fr 34px;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 9px 12px;
  border-radius: 16px;
  background: #f6f6f8;
}

.wordPickRow.isSelected {
  background: #eef8ff;
}

.wordPickCheck {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #e9e9ee;
  color: #fff;
  font-size: 15px;
  font-weight: 950;
}

.wordPickRow.isSelected .wordPickCheck {
  background: #0a84ff;
}

.wordPickCopy {
  min-width: 0;
}

.wordPickWord {
  display: block;
  color: #0d0f0e;
  font-size: 16px;
  line-height: 1.15;
  font-weight: 950;
}

.wordPickMeaning {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #8e9097;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wordPickLevel {
  color: #b0b2b8;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  text-align: right;
}

.wordPickerConfirm {
  position: fixed;
  right: 32px;
  bottom: calc(14px + env(safe-area-inset-bottom));
  left: 32px;
  width: auto;
}

.dictationStartButton.isDisabled {
  pointer-events: none;
  background: #d8dee6;
  color: #8a919a;
}

.playerHeader {
  padding-top: 2px;
}

.playerProgressText {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: #9a9ca2;
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
}

.playerProgressTrack {
  width: 100%;
  height: 6px;
  margin-top: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8e8ed;
}

.playerProgressFill {
  height: 100%;
  border-radius: 999px;
  background: #0d0f0e;
  transition: width 220ms ease;
}

.playerStage {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 74px;
  text-align: center;
}

.playerInstruction {
  color: #b0b2b8;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 850;
}

.speakerButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 174px;
  height: 174px;
  margin-top: 36px;
  border-radius: 999px;
  background: #0d0f0e;
  box-shadow: 0 22px 46px rgba(13, 15, 14, 0.16);
}

.speakerButton.isPlaying {
  transform: translateY(-1px);
  box-shadow: 0 26px 54px rgba(13, 15, 14, 0.2);
}

.speakerButton.isMissing {
  opacity: 0.38;
}

.speakerGlyph {
  position: relative;
  width: 92px;
  height: 92px;
}

.speakerCore {
  position: absolute;
  left: 8px;
  top: 32px;
  width: 28px;
  height: 28px;
  background: #fff;
}

.speakerCone {
  position: absolute;
  left: 32px;
  top: 20px;
  width: 0;
  height: 0;
  border-top: 26px solid transparent;
  border-bottom: 26px solid transparent;
  border-right: 36px solid #fff;
}

.speakerWave {
  position: absolute;
  top: 21px;
  border: 4px solid transparent;
  border-right-color: #fff;
  border-radius: 999px;
}

.speakerWave.one {
  right: 8px;
  width: 26px;
  height: 48px;
}

.speakerWave.two {
  right: -8px;
  width: 42px;
  height: 72px;
  top: 9px;
}

.spokenPrompt {
  max-width: 100%;
  margin-top: 28px;
  color: #0d0f0e;
  font-size: 22px;
  line-height: 1.35;
  font-weight: 950;
}

.forgotButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 122px;
  min-height: 40px;
  margin-top: 14px;
  padding: 0 18px;
  border: 2px solid #ffb3b3;
  border-bottom-width: 5px;
  border-radius: 999px;
  background: #fff5f5;
  color: #ff4b4b;
  font-size: 14px;
  font-weight: 950;
}

.forgotButton.isMarked {
  border-color: #ff4b4b;
  background: #ffdfe0;
}

.forgotButton:active {
  transform: translateY(2px);
}

.autoNextText {
  margin-top: 10px;
  color: #a3a5aa;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 800;
}

.countdownTrack {
  width: 72%;
  height: 8px;
  margin-top: 28px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e8ee;
}

.countdownFill {
  height: 100%;
  border-radius: 999px;
  background: #0a84ff;
  transition: width 220ms linear;
}

.transportRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  width: 100%;
  margin-top: 54px;
}

.transportButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #0d0f0e;
}

.transportIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: #f6f6f8;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}

.transportButton.isPrimary .transportIcon {
  background: #0d0f0e;
  color: #fff;
}

.transportLabel {
  color: #0d0f0e;
  font-size: 13px;
  line-height: 1;
  font-weight: 900;
}

.onlineAnswerPanel {
  display: grid;
  gap: 14px;
  margin-top: 38px;
}

.playerFootnote {
  margin-top: 70px;
  color: #babcc2;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  font-weight: 750;
}

.exitDictationButton {
  margin-top: 26px;
  color: #ff4d4f;
  font-size: 15px;
  line-height: 1;
  text-align: center;
  font-weight: 900;
}

.reportHero,
.setupHero {
  padding: 14px;
}

.reportHero {
  display: grid;
  gap: 18px;
  background:
    linear-gradient(135deg, rgba(20, 116, 103, 0.05), rgba(45, 110, 214, 0.04)),
    var(--surface);
}

.reportCopy {
  min-width: 0;
}

.reportTopline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.scoreBadgeLabel {
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
}

.scoreVisual {
  display: grid;
  gap: 18px;
  align-items: center;
  justify-items: center;
}

.scoreNumberBlock {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 154px;
  height: 154px;
  border-radius: 999px;
  background: conic-gradient(#0a84ff var(--score), #e6e8ed 0);
  box-shadow: 0 16px 30px rgba(10, 132, 255, 0.13);
}

.scoreNumberBlock::before {
  content: "";
  position: absolute;
  inset: 17px;
  border-radius: 999px;
  background: #fff;
}

.reportScore {
  position: relative;
  z-index: 1;
  margin-top: 0;
  font-size: 36px;
  line-height: 1;
  font-weight: 900;
  color: var(--ink);
}

.scoreMeter {
  display: grid;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.masteryRail {
  display: flex;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5eeeb;
  box-shadow: inset 0 0 0 1px rgba(16, 25, 23, 0.04);
}

.railSegment {
  height: 100%;
}

.railSegment.mastered {
  background: var(--accent);
}

.railSegment.mid {
  background: #2d6ed6;
}

.railSegment.weak {
  background: #d95b59;
}

.scoreLegend {
  display: grid;
  gap: 8px;
}

.legendRow {
  display: grid;
  grid-template-columns: 1fr 34px;
  gap: 10px;
  align-items: center;
  min-height: 34px;
  padding: 0 10px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.68);
  box-shadow: inset 0 0 0 1px var(--line);
}

.legendRow.mastered {
  box-shadow: inset 4px 0 0 var(--accent), inset 0 0 0 1px var(--line);
}

.legendRow.mid {
  box-shadow: inset 4px 0 0 #2d6ed6, inset 0 0 0 1px var(--line);
}

.legendRow.weak {
  box-shadow: inset 4px 0 0 #d95b59, inset 0 0 0 1px var(--line);
}

.legendName {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
  font-weight: 800;
}

.legendValue {
  color: var(--ink);
  font-size: 17px;
  line-height: 1;
  font-weight: 950;
  text-align: right;
}

.reportText,
.setupText {
  margin-top: 7px;
  font-size: 14px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 700;
}

.actionStack {
  display: grid;
  gap: 10px;
}

.setupTitle {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  color: var(--ink);
  font-weight: 900;
}

.controlGroup {
  display: grid;
  gap: 7px;
}

.segmentGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.segment {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  font-size: 16px;
  font-weight: 900;
}

.segment.isActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.dictationPanel {
  text-align: center;
}

.audioButton {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 184px;
  height: 184px;
  margin: 26px auto 0;
  border: 1px solid rgba(20, 116, 103, 0.22);
  border-radius: 46px;
  background:
    radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.98) 0 28%, rgba(221, 241, 236, 0.88) 29% 100%),
    linear-gradient(145deg, #f9fffc, #e2f2ee);
  color: var(--accent-strong);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 20px 44px rgba(20, 116, 103, 0.14);
}

.audioButton::before,
.audioButton::after {
  content: "";
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(20, 116, 103, 0.12);
  border-radius: 38px;
  pointer-events: none;
}

.audioButton::after {
  inset: 34px;
  border-color: rgba(45, 110, 214, 0.12);
  border-radius: 30px;
}

.audioButton.isPlaying {
  transform: translateY(-1px);
  border-color: rgba(20, 116, 103, 0.36);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 24px 52px rgba(20, 116, 103, 0.18);
}

.audioButton.isMissing {
  opacity: 0.72;
}

.playIcon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 12px 24px rgba(20, 116, 103, 0.22);
}

.audioButton.isPlaying .playIcon {
  animation: playPulse 980ms ease-in-out infinite;
}

.playTriangle {
  width: 0;
  height: 0;
  margin-left: 4px;
  border-top: 11px solid transparent;
  border-bottom: 11px solid transparent;
  border-left: 16px solid white;
}

.audioButtonMain {
  position: relative;
  z-index: 1;
  font-size: 28px;
  line-height: 1;
  font-weight: 900;
}

.audioButtonSub {
  position: relative;
  z-index: 1;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
}

.dictationHint {
  margin-top: 20px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
}

@keyframes successRing {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.45);
  }

  28% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}

@keyframes playPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 12px 24px rgba(20, 116, 103, 0.22);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 16px 30px rgba(20, 116, 103, 0.28);
  }
}

@keyframes rewardPop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.35) rotate(0deg);
  }

  14% {
    opacity: 1;
  }

  58% {
    opacity: 1;
    transform: translate(var(--tx), var(--ty)) scale(var(--scale)) rotate(var(--rot));
  }

  100% {
    opacity: 0;
    transform: translate(var(--tx), calc(var(--ty) + var(--fall))) scale(0.86) rotate(calc(var(--rot) + 80deg));
  }
}

@keyframes answerPop {
  0% {
    transform: scale(0.985);
  }

  42% {
    transform: scale(1.018);
  }

  100% {
    transform: scale(1);
  }
}

@media (max-width: 374px) {
  .wordTitle {
    font-size: 40px;
  }

  .choiceText {
    font-size: 16px;
  }

  .scoreVisual {
    grid-template-columns: 82px 1fr;
  }

  .reportScore {
    font-size: 25px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progressFill,
  .practiceItem,
  .bottomButton,
  .secondaryButton,
  .bottomNavItem,
  .segment,
  .choiceItem {
    transition: none;
  }

  .celebrationLayer {
    display: none;
  }

  .choiceItem.isCorrect {
    animation: none;
  }
}

/* Duolingo-inspired interaction pass: compact, tactile, bottom-reachable. */
.screen {
  box-sizing: border-box;
  color: var(--ink);
  background: #fff;
  max-width: 100vw;
  overflow-x: hidden;
}

.screen *,
.screen *::before,
.screen *::after {
  box-sizing: border-box;
}

.sectionStack,
.heroBlock,
.practiceList,
.practiceItem,
.homeQuickGrid,
.homeQuickCard,
.homePathCard,
.bottomNav,
.bottomNavInner {
  max-width: 100%;
}

.appHeader {
  min-height: 44px;
  margin-bottom: 10px;
  padding: 0;
}

.brand {
  color: #3c3c3c;
  font-size: 25px;
  font-weight: 950;
}

.tagline {
  color: #777;
  font-size: 12px;
}

.headerMark {
  height: 34px;
  min-width: 68px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 16px;
  color: var(--accent-strong);
  font-weight: 950;
}

.sectionStack {
  gap: 10px;
}

.heroBlock {
  position: relative;
  min-height: 158px;
  padding: 16px;
  border-radius: 24px;
  background: #1cb0f6;
  box-shadow: inset 0 -6px #178ec8;
}

.heroBlock .labelText,
.heroBlock .heroTitle {
  color: #fff;
}

.heroTitle {
  max-width: 100%;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1.14;
  font-weight: 950;
}

.heroMeta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.heroMeta text {
  min-width: 0;
  min-height: 32px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 950;
}

.unitPicker {
  min-height: 42px;
  margin-top: 10px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: inset 0 -4px #d9d9d9;
}

.unitPickerText {
  flex: 0 0 auto;
  color: #777;
  font-weight: 850;
}

.unitPickerValue {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #3c3c3c;
  font-weight: 950;
}

.practiceList {
  gap: 10px;
}

.practiceItem {
  grid-template-columns: minmax(0, 1fr) 72px;
  min-height: 94px;
  border-radius: 22px;
  box-shadow: inset 0 -6px rgba(0, 0, 0, 0.18);
}

.practiceCopy,
.practiceTitle,
.practiceDesc {
  min-width: 0;
}

.practiceItem.isPrimary {
  background: var(--accent);
}

.practiceItem:not(.isPrimary) {
  background: #1cb0f6;
}

.practiceItem:active,
.dictationStartButton:active,
.bottomButton:active,
.secondaryButton:active,
.dangerButton:active,
.choiceItem:active,
.transportButton:active,
.wordPickRow:active,
.selectWordRow:active {
  transform: translateY(2px);
  filter: saturate(0.96);
}

.practiceTitle {
  font-size: 23px;
  font-weight: 950;
}

.practiceDesc {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 750;
}

.practiceAction {
  justify-self: end;
  height: 42px;
  border-radius: 999px;
  color: var(--info);
  box-shadow: inset 0 -3px #d9d9d9;
}

.homeQuickGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.homeQuickCard {
  min-height: 86px;
  padding: 14px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 20px;
  background: #fff;
}

.quickValue {
  display: block;
  color: #3c3c3c;
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
}

.quickLabel {
  display: block;
  margin-top: 8px;
  color: #777;
  font-size: 13px;
  font-weight: 900;
}

.homePathCard {
  padding: 13px 14px 14px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 20px;
  background: #fff;
}

.homePathHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.homePathTitle,
.homePathMeta,
.homePathIndex,
.homePathText {
  display: block;
}

.homePathTitle {
  color: #3c3c3c;
  font-size: 15px;
  font-weight: 950;
}

.homePathMeta {
  color: #afafaf;
  font-size: 12px;
  font-weight: 900;
}

.homePathSteps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.homePathStep {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  min-height: 38px;
  padding: 0 9px;
  border-radius: 14px;
  background: #f7f7f7;
}

.homePathStep.isGreen {
  background: #d7ffb8;
}

.homePathStep.isBlue {
  background: #ddf4ff;
}

.homePathIndex {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 999px;
  background: #3c3c3c;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
}

.homePathStep.isGreen .homePathIndex {
  background: var(--accent);
}

.homePathStep.isBlue .homePathIndex {
  background: #1cb0f6;
}

.homePathText {
  min-width: 0;
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 950;
}

.bottomNav {
  border-top: 2px solid #e5e5e5;
  background: rgba(255, 255, 255, 0.96);
}

.bottomNavInner {
  gap: 10px;
}

.bottomNavItem {
  min-height: 48px;
  border-radius: 16px;
  color: #777;
}

.bottomNavItem.isActive {
  border: 2px solid #84d8ff;
  background: #ddf4ff;
  color: #1cb0f6;
}

.bottomNavBadge {
  top: 0;
  right: 10px;
  background: var(--danger);
}

.flowScreen {
  min-height: calc(100dvh - 42px);
  padding-bottom: calc(108px + env(safe-area-inset-bottom));
  gap: 8px;
}

.flowHeader {
  min-height: 44px;
  margin-bottom: 6px;
}

.flowHeader .backButton::before {
  width: 29px;
  height: 5px;
  border: 0;
  border-radius: 999px;
  background: #afafaf;
  transform: rotate(45deg);
}

.flowHeader .backButton::after {
  content: "";
  position: absolute;
  width: 29px;
  height: 5px;
  border-radius: 999px;
  background: #afafaf;
  transform: rotate(-45deg);
}

.flowProgress {
  gap: 6px;
}

.flowTitleText {
  color: #3c3c3c;
  font-size: 16px;
  font-weight: 950;
}

.flowMeta {
  color: #afafaf;
  font-size: 12px;
  font-weight: 900;
}

.progressTrack,
.playerProgressTrack {
  height: 13px;
  border-radius: 999px;
  background: #e5e5e5;
}

.progressFill,
.playerProgressFill {
  background: var(--accent);
  box-shadow: inset 0 -3px rgba(0, 0, 0, 0.14);
}

.questionPanel,
.spellPanel {
  flex: 1;
  padding: 0 2px;
  overflow: visible;
  border-radius: 0;
  background: transparent;
}

.questionPanel {
  display: flex;
  flex-direction: column;
}

.questionPanel .labelText,
.spellPanel .labelText {
  color: #777;
  font-size: 15px;
  font-weight: 950;
}

.wordTitle {
  margin-top: 14px;
  overflow-wrap: anywhere;
  color: #3c3c3c;
  font-size: 44px;
  line-height: 1.04;
  font-weight: 950;
}

.phonetic {
  margin-top: 8px;
  color: #777;
  font-size: 15px;
  font-weight: 800;
}

.choiceList {
  margin-top: auto;
  padding-top: 22px;
  gap: 10px;
}

.choiceItem {
  min-height: 58px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 16px;
  background: #fff;
}

.choiceItem.isLocked {
  opacity: 1;
}

.choiceItem.isLocked:not(.isCorrect):not(.isWrong):not(.isCorrectAnswer) {
  opacity: 0.38;
}

.choiceKey {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #ddf4ff;
  color: #1cb0f6;
}

.choiceText {
  color: #3c3c3c;
  font-size: 17px;
  font-weight: 900;
}

.choiceItem.isCorrect,
.choiceItem.isCorrectAnswer {
  border-color: #58cc02;
  background: #d7ffb8;
}

.choiceItem.isCorrect .choiceKey,
.choiceItem.isCorrectAnswer .choiceKey {
  background: #58cc02;
}

.choiceItem.isWrong {
  border-color: #ff4b4b;
  background: #ffdfe0;
}

.choiceResult {
  border-radius: 12px;
  background: #58cc02;
}

.choiceResult.wrong {
  background: #ff4b4b;
}

.wrongActionBar,
.feedbackBox.success {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  padding: 20px 24px calc(18px + env(safe-area-inset-bottom));
  border: 0;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 28px rgba(60, 60, 60, 0.12);
}

.feedbackBox.success {
  background: #d7ffb8;
}

.wrongActionBar {
  grid-template-columns: 1fr;
  gap: 12px;
  background: #ffdfe0;
}

.wrongActionText {
  white-space: normal;
}

.inlineNextButton {
  height: 54px;
  border-radius: 16px;
  background: #ff4b4b;
  box-shadow: inset 0 -5px #d93636;
}

.meaningTitle {
  margin-top: 20px;
  color: #3c3c3c;
  font-size: 32px;
}

.fieldGroup {
  margin-top: 24px;
}

.textInput {
  height: 58px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 16px;
  background: #fff;
}

.flowScreen > .bottomButton {
  position: fixed;
  right: 24px;
  bottom: calc(14px + env(safe-area-inset-bottom));
  left: 24px;
  z-index: 35;
  width: auto;
  height: 56px;
}

.bottomButton,
.dictationStartButton {
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  box-shadow: inset 0 -5px var(--accent-strong);
}

.secondaryButton {
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 16px;
  color: #1cb0f6;
}

.dangerButton {
  border: 2px solid #ffb3b3;
  border-bottom-width: 5px;
  border-radius: 16px;
}

.checkupSetupScreen,
.dictationSetupScreen,
.dictationWordScreen,
.dictationPlayerScreen {
  padding-right: 24px;
  padding-left: 24px;
}

.navBack .chevronLeft {
  width: 16px;
  height: 16px;
  border-left-color: #afafaf;
  border-bottom-color: #afafaf;
}

.dictationIntroTitle,
.wordPickerTitle {
  color: #3c3c3c;
  font-size: 26px;
}

.dictationIntroText,
.wordPickerMeta {
  color: #777;
}

.pill {
  border: 2px solid transparent;
  border-bottom-width: 4px;
}

.pill.isActive {
  border-color: var(--accent-strong);
  background: var(--accent);
  color: #fff;
}

.dictationContentCard,
.checkupStat,
.wordPickRow,
.selectWordRow,
.weakbookHero,
.weakbookPanel,
.weakList,
.reportHero {
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 20px;
  background: #fff;
}

.dictationTip {
  background: #ddf4ff;
  color: #1cb0f6;
}

.dictationSetupScreen > .dictationStartButton,
.checkupSetupScreen > .dictationStartButton,
.wordPickerConfirm,
.reportActions {
  max-width: 382px;
}

.dictationSetupScreen > .dictationStartButton,
.checkupSetupScreen > .dictationStartButton {
  position: static;
  width: 100%;
  max-width: none;
  margin-top: 18px;
  transform: none;
  box-shadow: inset 0 -6px var(--accent-strong);
}

.wordPickRow.isSelected,
.selectWordRow.isSelected {
  border-color: #84d8ff;
  background: #ddf4ff;
}

.wordPickRow.isSelected .wordPickCheck,
.selectWordRow.isSelected .selectDot {
  border-color: #1cb0f6;
  background: #1cb0f6;
}

.weakbookHero,
.weakbookPanel {
  padding: 14px;
}

.weakbookActions {
  position: sticky;
  top: calc(8px + env(safe-area-inset-top));
  z-index: 5;
  padding: 8px 0;
  background: #fff;
}

.playerHeader {
  padding-top: 0;
}

.playerStage {
  flex: 1;
  justify-content: center;
  margin-top: 18px;
}

.playerInstruction {
  color: #afafaf;
  font-size: 15px;
}

.speakerButton {
  width: 146px;
  height: 146px;
  margin-top: 22px;
  background: #1cb0f6;
  box-shadow: inset 0 -7px #178ec8, 0 18px 34px rgba(28, 176, 246, 0.18);
}

.speakerButton.isPlaying {
  box-shadow: inset 0 -7px #178ec8, 0 20px 38px rgba(28, 176, 246, 0.22);
}

.speakerGlyph {
  transform: scale(0.82);
}

.spokenPrompt {
  margin-top: 20px;
  color: #3c3c3c;
  font-size: 24px;
}

.autoNextText {
  margin-top: 6px;
  color: #777;
}

.countdownTrack {
  width: 78%;
  margin-top: 18px;
  background: #e5e5e5;
}

.countdownFill {
  background: #ffc800;
  box-shadow: inset 0 -3px #e5a500;
}

.transportRow {
  gap: 14px;
  margin-top: 24px;
}

.transportIcon {
  width: 54px;
  height: 54px;
  background: #f7f7f7;
  box-shadow: inset 0 -4px #e5e5e5;
}

.transportButton.isPrimary .transportIcon {
  background: #3c3c3c;
  box-shadow: inset 0 -4px #222;
}

.playerFootnote {
  margin-top: 18px;
}

.exitDictationButton {
  margin-top: 18px;
  color: #ff4b4b;
}

.onlineAnswerPanel {
  position: fixed;
  right: 24px;
  bottom: calc(14px + env(safe-area-inset-bottom));
  left: 24px;
  z-index: 35;
  max-width: 382px;
  margin: 0 auto;
  padding-top: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff 28%);
}

.reportScreen {
  padding-bottom: 122px;
}

.reportHero {
  gap: 12px;
  padding: 14px;
  background: #fff;
}

.scoreVisual {
  grid-template-columns: 116px 1fr;
  gap: 12px;
  justify-items: stretch;
}

.scoreNumberBlock {
  width: 112px;
  height: 112px;
  background: conic-gradient(var(--accent) var(--score), #e5e5e5 0);
}

.scoreNumberBlock::before {
  inset: 14px;
}

.reportScore {
  font-size: 28px;
}

.masteryRail {
  height: 12px;
  background: #e5e5e5;
}

.railSegment.mastered {
  background: #58cc02;
}

.railSegment.mid {
  background: #ffc800;
}

.railSegment.weak {
  background: #ff4b4b;
}

.legendRow {
  min-height: 32px;
  background: #fff;
}

.reportActions {
  gap: 8px;
}

.reportActions .bottomButton {
  background: var(--accent);
  box-shadow: inset 0 -5px var(--accent-strong);
}

.reportActions .secondaryButton {
  color: #1cb0f6;
}

.homeScreen {
  gap: 10px;
}

.homeScreen .heroBlock {
  min-height: auto;
  padding: 16px;
}

.heroTitleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.heroStats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.heroStatCard {
  min-width: 0;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.2);
}

.heroStatValue,
.heroStatLabel {
  display: block;
  color: #fff;
}

.heroStatValue {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28px;
  line-height: 1;
  font-weight: 950;
}

.heroStatLabel {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 900;
  opacity: 0.82;
}

.unitSwitchGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.unitSwitchCell {
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 15px;
  background: #fff;
  box-shadow: inset 0 -4px #d9d9d9;
}

.unitSwitchLabel,
.unitSwitchValue {
  display: block;
}

.unitSwitchLabel {
  color: #afafaf;
  font-size: 10px;
  line-height: 1;
  font-weight: 900;
}

.unitSwitchValue {
  margin-top: 5px;
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.05;
  font-weight: 950;
}

.heroHint {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
}

.heroHint text {
  display: block;
  color: #fff;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 800;
}

.quickPickButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-radius: 14px;
  background: #ddf4ff;
  color: #1cb0f6;
  font-weight: 950;
}

.quickPickGroup {
  display: grid;
  grid-template-columns: repeat(3, 42px);
  gap: 7px;
}

.quickPickButton {
  height: 36px;
  border-bottom: 4px solid #84d8ff;
}

.homeScreen {
  gap: 12px;
}

.homeUnitCard {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 6px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.94)),
    linear-gradient(135deg, #d7ffb8 0%, #ddf4ff 62%, #ffffff 100%);
}

.homeUnitCard::before {
  content: "";
  position: absolute;
  top: -54px;
  right: -48px;
  width: 150px;
  height: 150px;
  border-radius: 999px;
  background: rgba(88, 204, 2, 0.18);
  pointer-events: none;
}

.homeUnitCard > * {
  position: relative;
  z-index: 1;
}

.homeUnitTopline,
.homeUnitRow,
.homeStatPrimary,
.homeStatSecondary,
.homeActionHeader {
  display: flex;
  align-items: center;
}

.homeUnitTopline,
.homeActionHeader {
  justify-content: space-between;
  gap: 12px;
}

.homeUnitLabel,
.homeUnitMeta,
.homeUnitTitle,
.homeUnitBadge,
.homeMasteryPill,
.homeStatNumber,
.homeStatTitle,
.homeStatHint,
.homeUnitTip,
.homeActionTitle,
.homeActionMeta,
.practiceMini {
  display: block;
}

.homeUnitLabel {
  padding: 5px 9px;
  border-radius: 999px;
  background: #ddf4ff;
  color: #1cb0f6;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

.homeUnitMeta {
  color: #777;
  font-size: 12px;
  font-weight: 900;
}

.homeUnitTitle {
  margin-top: 12px;
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24px;
  line-height: 1.12;
  font-weight: 950;
}

.homeUnitRow {
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.homeUnitBadge,
.homeMasteryPill {
  min-width: 0;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  line-height: 36px;
  font-size: 13px;
  font-weight: 950;
}

.homeUnitBadge {
  flex: 0 0 auto;
  background: #1cb0f6;
  color: #fff;
  box-shadow: inset 0 -4px #178ec8;
}

.homeMasteryPill {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  overflow: hidden;
  background: #f7f7f7;
  color: #777;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: inset 0 -3px #e5e5e5;
}

.homeMasteryPillFill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  border-radius: inherit;
  background: rgba(88, 204, 2, 0.18);
  box-shadow: inset 0 -3px rgba(88, 204, 2, 0.12);
  transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

.homeMasteryPill > text {
  position: relative;
  z-index: 1;
}

.homeStatRow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.homeStatPrimary,
.homeStatSecondary {
  gap: 9px;
  min-width: 0;
  min-height: 58px;
  padding: 10px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 18px;
  background: #fff;
}

.homeStatPrimary {
  border-color: #84d8ff;
  background: #ddf4ff;
}

.homeStatSecondary {
  border-color: #b8ef91;
  background: #f3ffe9;
}

.homeStatPrimary:active,
.homeStatSecondary:active {
  transform: translateY(2px);
  filter: saturate(0.96);
}

.homeStatNumber {
  flex: 0 0 auto;
  color: #3c3c3c;
  font-size: 25px;
  line-height: 1;
  font-weight: 950;
}

.homeStatTitle {
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 950;
}

.homeStatHint {
  margin-top: 3px;
  overflow: hidden;
  color: #777;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 850;
}

.homeStatSecondary .homeStatNumber,
.homeStatSecondary .homeStatHint {
  color: #58a700;
}

.homeUnitCard .unitSwitchGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.homeUnitCard .unitSwitchCell {
  min-height: 46px;
  padding: 8px 10px;
  border-radius: 15px;
  background: #f7f7f7;
  box-shadow: inset 0 -3px #e5e5e5;
}

.homeUnitCard .unitSwitchLabel {
  color: #afafaf;
  font-size: 10px;
}

.homeUnitCard .unitSwitchValue {
  margin-top: 6px;
  font-size: 14px;
}

.homeUnitTip {
  margin-top: 10px;
  color: #777;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 850;
}

.homeActionHeader {
  padding: 0 2px;
}

.homeActionTitle {
  color: #3c3c3c;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 950;
}

.homeActionMeta {
  color: #afafaf;
  font-size: 12px;
  font-weight: 900;
}

.homeScreen .practiceList {
  gap: 10px;
}

.homeScreen .practiceItem {
  grid-template-columns: 38px minmax(0, 1fr) 74px;
  align-items: center;
  min-height: 90px;
  padding: 14px;
  border: 2px solid transparent;
  border-bottom-width: 6px;
  border-radius: 22px;
  box-shadow: none;
}

.homeScreen .practiceItem.isPrimary {
  border-color: #46a302;
  background: #58cc02;
}

.homeScreen .practiceItem.isSecondary {
  border-color: #84d8ff;
  background: #fff;
}

.practiceRank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 16px;
  font-weight: 950;
}

.practiceRank.blue {
  background: #ddf4ff;
  color: #1cb0f6;
}

.homeScreen .practiceCopy {
  justify-content: center;
}

.homeScreen .practiceTitle {
  margin-top: 0;
  color: #fff;
  font-size: 23px;
  line-height: 1.12;
  font-weight: 950;
}

.homeScreen .practiceDesc {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.25;
  font-weight: 850;
}

.practiceMini {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
}

.homeScreen .practiceItem.isSecondary .practiceTitle {
  color: #3c3c3c;
}

.homeScreen .practiceItem.isSecondary .practiceDesc {
  color: #777;
}

.homeScreen .practiceItem.isSecondary .practiceMini {
  color: #1cb0f6;
}

.homeScreen .practiceAction {
  align-self: center;
  justify-self: end;
  width: 70px;
  height: 42px;
  border-radius: 999px;
  background: #fff;
  color: #58a700;
  font-size: 15px;
  box-shadow: inset 0 -3px #d9d9d9;
}

.homeScreen .practiceItem.isSecondary .practiceAction {
  background: #1cb0f6;
  color: #fff;
  box-shadow: inset 0 -3px #178ec8;
}

.unitWordScreen {
  min-height: 100vh;
  min-height: 100dvh;
  margin: calc(-16px - env(safe-area-inset-top)) -18px calc(-26px - env(safe-area-inset-bottom));
  padding: calc(14px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
  background: #fff;
}

.unitWordHeader {
  margin-top: 18px;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 20px;
  background: #fff;
}

.unitWordTitle,
.unitWordMeta,
.unitWordTip {
  display: block;
}

.unitWordTitle {
  color: #3c3c3c;
  font-size: 26px;
  line-height: 1.12;
  font-weight: 950;
}

.unitWordMeta {
  margin-top: 8px;
  color: #777;
  font-size: 15px;
  font-weight: 900;
}

.unitWordTip {
  margin-top: 10px;
  color: #1cb0f6;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 850;
}

.unitWordList {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.unitWordRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 78px;
  gap: 10px;
  align-items: center;
  min-height: 70px;
  padding: 10px 12px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 18px;
  background: #fff;
}

.unitWordRow.isMastered {
  border-color: #b8ef91;
  background: #f3ffe9;
}

.unitWordCopy {
  min-width: 0;
}

.unitWordEnglish,
.unitWordMeaning {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitWordEnglish {
  color: #111;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 950;
}

.unitWordMeaning {
  margin-top: 5px;
  color: #8d8f96;
  font-size: 13px;
  font-weight: 850;
}

.unitWordKnownButton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  box-shadow: inset 0 -4px var(--accent-strong);
  font-size: 13px;
  font-weight: 950;
}

.unitWordKnownButton.isDone {
  background: #e5e5e5;
  color: #777;
  box-shadow: inset 0 -4px #d9d9d9;
}

.checkupStatEditable {
  position: relative;
  border: 2px solid #84d8ff;
  border-bottom: 5px solid #84d8ff;
  background: #ddf4ff;
}

.checkupStatEditable .checkupLimitInput {
  width: 58px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1cb0f6;
}

.checkupStatEditable .checkupStatLabel {
  color: #3c3c3c;
}

.dictationProblemRow {
  display: grid;
  grid-template-columns: minmax(108px, 0.62fr) 1fr;
  gap: 12px;
  align-items: center;
  min-height: 54px;
  padding: 0 10px;
  border: 2px solid #ffb3b3;
  border-bottom-width: 5px;
  border-radius: 16px;
  background: #fff5f5;
}

.dictationProblemRow + .dictationProblemRow {
  margin-top: 8px;
}

.dictationProblemRow .weakWord,
.dictationProblemRow .weakMeaning {
  color: #d93636;
}

.dictationReviewList {
  display: grid;
  gap: 10px;
}

.dictationReviewRow {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 58px;
  padding: 8px 10px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 16px;
  background: #fff;
}

.dictationReviewRow + .dictationReviewRow {
  margin-top: 8px;
}

.dictationReviewRow.isProblem {
  border-color: #ffb3b3;
  background: #fff5f5;
}

.reviewIndex {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-radius: 999px;
  font-weight: 950;
}

.reviewIndex {
  width: 30px;
  height: 30px;
  background: #f1f1f1;
  color: #777;
  font-size: 12px;
}

.reviewCopy {
  min-width: 0;
}

.dictationReviewRow.isProblem .reviewIndex {
  background: #ff4b4b;
  color: #fff;
}

.dictationReviewRow.isProblem .weakWord,
.dictationReviewRow.isProblem .weakMeaning {
  color: #d93636;
}

.dictationSummaryCard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 15px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 20px;
  background: #fff;
}

.dictationSummaryCopy {
  min-width: 0;
}

.summaryTitleRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summaryInlineMeta {
  display: block;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f1f1;
  color: #777;
  font-size: 11px;
  line-height: 1;
  font-weight: 950;
}

.dictationSummaryCard .reportText {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.35;
}

.dictationSummaryStats {
  display: grid;
  grid-template-columns: repeat(2, 50px);
  gap: 8px;
}

.summaryStat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border-radius: 15px;
  background: #f7f7f7;
  box-shadow: inset 0 -4px #e5e5e5;
}

.summaryStat.isProblem {
  background: #fff5f5;
  box-shadow: inset 0 -4px #ffb3b3;
}

.summaryStatValue,
.summaryStatLabel {
  display: block;
}

.summaryStatValue {
  color: #3c3c3c;
  font-size: 20px;
  line-height: 1;
  font-weight: 950;
}

.summaryStatLabel {
  margin-top: 5px;
  color: #777;
  font-size: 11px;
  line-height: 1;
  font-weight: 900;
}

.summaryStat.isProblem .summaryStatValue,
.summaryStat.isProblem .summaryStatLabel {
  color: #ff4b4b;
}

.dictationSetupScreen {
  display: flex;
  flex-direction: column;
}

.dictationSetupScreen .dictationIntro {
  margin-top: clamp(12px, 2.4vh, 24px);
}

.dictationSetupScreen .dictationIntroTitle {
  font-size: clamp(26px, 7.1vw, 34px);
}

.dictationSetupScreen .settingGroup {
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 10px 12px;
  margin-top: clamp(12px, 1.8vh, 18px);
}

.dictationSetupScreen .settingLabel {
  font-size: clamp(13px, 3.4vw, 15px);
}

.dictationSetupScreen .pill {
  min-width: clamp(60px, 17vw, 78px);
  height: clamp(34px, 5.2vh, 40px);
  padding: 0 12px;
  font-size: clamp(13px, 3.5vw, 15px);
}

.dictationModeTip {
  display: block;
  margin-top: clamp(8px, 1.4vh, 12px);
  margin-left: 88px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ddf4ff;
  color: #1cb0f6;
  font-size: clamp(12px, 3.2vw, 14px);
  line-height: 1.35;
  font-weight: 850;
}

.dictationSetupScreen .dictationContentCard {
  margin-top: clamp(14px, 2.5vh, 28px);
  padding: clamp(13px, 2vh, 18px) 15px;
}

.dictationSetupScreen > .dictationStartButton {
  height: clamp(58px, 7vh, 68px);
  margin-top: clamp(18px, 3.8vh, 38px);
}

.reportScreen .dictationReportHeader {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  gap: 8px;
  align-items: center;
  min-height: 48px;
  margin-bottom: 2px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.reportScreen .dictationReportHeader .backButton {
  width: 42px;
  height: 42px;
  background: #f7f7f7;
}

.dictationReportPageTitle {
  display: block;
  color: #0d0f0e;
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
  text-align: center;
}

.reportHeaderSpacer {
  width: 42px;
  height: 42px;
}

.dictationReportTitle {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.reportHeaderKicker {
  display: block;
  padding: 4px 9px;
  border-radius: 999px;
  background: #ddf4ff;
  color: #1cb0f6;
  font-size: 11px;
  line-height: 1;
  font-weight: 950;
}

.dictationPriorityList {
  display: grid;
  gap: 10px;
}

.dictationReviewRow.hasStatus {
  grid-template-columns: 34px minmax(0, 1fr) 52px;
}

.reviewStatus {
  display: block;
  justify-self: end;
  padding: 7px 10px;
  border-radius: 999px;
  background: #ff4b4b;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

@media (max-height: 720px) {
  .dictationSetupScreen .dictationIntroTitle {
    font-size: 25px;
  }

  .dictationSetupScreen .settingGroup {
    margin-top: 10px;
  }

  .dictationSetupScreen .pill {
    height: 32px;
    font-size: 13px;
  }

  .dictationModeTip {
    padding: 8px 11px;
  }

  .dictationSetupScreen > .dictationStartButton {
    height: 58px;
    margin-top: 16px;
  }
}

@media (max-width: 374px) {
  .wordTitle {
    font-size: 38px;
  }

  .choiceText {
    font-size: 15px;
  }

  .choiceItem {
    min-height: 54px;
  }

  .speakerButton {
    width: 132px;
    height: 132px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .speakerButton.isPlaying,
  .audioButton.isPlaying .playIcon {
    animation: none;
  }
}
</style>
