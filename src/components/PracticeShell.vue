<template>
  <view
    :class="[
      'screen',
      showBottomNav && 'hasBottomNav',
      isSplitScreen && 'isSplitScreen'
    ]"
    :style="screenStyle"
  >
    <view v-if="showAppHeader" class="appHeader">
      <view>
        <text class="brand">会了吗英语</text>
        <text class="tagline">词汇体检 / 自动听写</text>
      </view>
      <view class="headerMark">
        <text>GotIt</text>
      </view>
    </view>

    <view v-if="activeScreen === 'courseSetup'" class="courseSetupScreen">
      <view class="dictationNav">
        <view v-if="courseSetupCompleted" class="navBack" @tap="goBack">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">教材选择</text>
      </view>

      <view class="coursePanel">
        <view class="courseSection">
          <text class="courseSectionTitle">学段</text>
          <view class="courseChipGrid two">
            <view
              v-for="stage in courseSetupStageOptions"
              :key="stage"
              :class="['courseChip', courseSetupStage === stage && 'isActive']"
              @tap="setCourseSetupStage(stage)"
            >
              <text>{{ stage }}</text>
            </view>
          </view>
        </view>

        <view v-if="courseSetupStage === '初中'" class="courseSection">
          <text class="courseSectionTitle">年级</text>
          <view class="courseChipGrid">
            <view
              v-for="grade in courseSetupGradeOptions"
              :key="grade"
              :class="['courseChip', courseSetupGrade === grade && 'isActive']"
              @tap="setCourseSetupGrade(grade)"
            >
              <text>{{ grade }}</text>
            </view>
          </view>
        </view>

        <view v-if="courseSetupStage === '高中' || courseSetupGrade" class="courseSection">
          <text class="courseSectionTitle">教材版本</text>
          <view v-if="courseSetupPublisherOptions.length > 0" class="courseChipGrid">
            <view
              v-for="publisher in courseSetupPublisherOptions"
              :key="publisher.id"
              :class="['courseChip', courseSetupPublisherId === publisher.id && 'isActive']"
              @tap="setCourseSetupPublisher(publisher.id)"
            >
              <text>{{ publisher.name }}</text>
            </view>
          </view>
          <view v-else class="courseUnavailable">
            <text>当前词库暂未上线</text>
          </view>
        </view>

        <view v-if="courseSetupPublisherOptions.length > 0" class="courseSection">
          <text class="courseSectionTitle">册</text>
          <view v-if="courseSetupBookOptions.length > 0" class="courseChipGrid two">
            <view
              v-for="book in courseSetupBookOptions"
              :key="book.id"
              :class="['courseChip', book.masteryPercent != null && 'hasMeta', courseSetupBookId === book.id && 'isActive']"
              @tap="setCourseSetupBook(book.id)"
            >
              <text class="courseChipLabel">{{ book.name }}</text>
              <text v-if="book.masteryPercent != null" class="courseChipMeta">{{ book.masteryPercent }}% 掌握</text>
            </view>
          </view>
          <view v-else class="courseUnavailable">
            <text>先选择已上线的教材版本</text>
          </view>
        </view>

        <view v-if="courseSetupBookOptions.length > 0" class="courseSection">
          <text class="courseSectionTitle">Unit</text>
          <view v-if="courseSetupUnitOptions.length > 0" class="courseUnitGrid">
            <view
              v-for="unit in courseSetupUnitOptions"
              :key="unit.id"
              :class="['courseUnitChip', courseSetupUnitId === unit.id && 'isActive']"
              @tap="setCourseSetupUnit(unit.id)"
            >
              <text class="courseUnitName">{{ unit.name }}</text>
              <text class="courseUnitCount">
                {{ unit.count }} 词<text v-if="unit.masteryPercent != null" class="courseUnitMastery"> · {{ unit.masteryPercent }}% 掌握</text>
              </text>
            </view>
          </view>
          <view v-else class="courseUnavailable">
            <text>该册暂无 Unit 词库</text>
          </view>
        </view>
      </view>

      <view :class="['courseConfirmButton', !courseSetupCanConfirm && 'isDisabled']" @tap="confirmCourseSetupPage">
        <text>{{ courseSetupCanConfirm ? '进入学习' : '暂未上线' }}</text>
      </view>
    </view>

    <view
      v-else-if="activeScreen === 'home'"
      class="sectionStack homeScreen"
    >
      <view class="homeHero">
        <view class="homeHeroMain">
          <view class="homeHeroTitle">课本单词通</view>
          <view class="homeHeroSubtitle">别急着背更多，先把课本里的单词真正掌握</view>
        </view>
        <view class="homeHeroTags">
          <text class="homeHeroTag">教材同步</text>
          <text class="homeHeroTag">自动听写</text>
          <text class="homeHeroTag">生词复习</text>
        </view>
      </view>

      <view class="homeUnitCard">
        <view class="homeUnitTopline">
          <text class="homeUnitLabel">当前学习</text>
          <text class="homeUnitMeta">{{ unitMasteryPercent }}% 掌握</text>
        </view>

        <text class="homeUnitTitle">{{ selectedUnit?.bookName }} · {{ selectedUnit?.unitName }}</text>
        <text class="homeUnitSubtitle">{{ selectedUnit?.publisherName }}</text>

        <view class="homeUnitRow">
          <view class="homeMasteryPill">
            <view class="homeMasteryPillFill" :style="{ width: unitMasteryPercent + '%' }" />
            <text class="homeMasteryText">{{ unitMasteryLabel }} 已掌握</text>
          </view>
        </view>

        <view class="homeStatRow">
          <view class="homeStatPrimary" @tap="openUnitWordsPage()">
            <text class="homeStatNumber">{{ unitWordCount }}</text>
            <view>
              <text class="homeStatTitle">总单词</text>
              <text class="homeStatHint">查看完整词表</text>
            </view>
          </view>
          <view class="homeStatSecondary" @tap="openUnitWordsPage(true)">
            <text class="homeStatNumber">{{ masteredUnitWordCount }}</text>
            <view>
              <text class="homeStatTitle">已掌握</text>
              <text class="homeStatHint">查看掌握词</text>
            </view>
          </view>
        </view>

        <view class="homeSwitchRow" @tap="openCourseSetupPage">
          <view class="homeSwitchInfo">
            <text class="homeSwitchLabel">切换教材</text>
            <text class="homeSwitchValue">{{ schoolStageOptions[selectedSchoolStageIndex] }} · {{ publisherOptions[selectedPublisherIndex] }} · {{ bookOptions[selectedBookIndex] }} · {{ unitQuickOptions[selectedUnitQuickIndex] }}</text>
          </view>
          <text class="homeSwitchArrow">›</text>
        </view>
      </view>

      <view class="homeDictationStage">
        <view
          class="homeDictationEntry"
          hover-class="isPressed"
          :hover-start-time="20"
          :hover-stay-time="80"
          @tap="openDictationSetupPage"
        >
          <view class="homeDictationRing">
            <view class="homeDictationButton">
              <view class="homeDictationIcon">
                <image src="/static/tabbar/dictation-active.png" mode="aspectFit" />
              </view>
              <text class="homeDictationTitle">自动听写</text>
            </view>
          </view>
        </view>
      </view>

    </view>

    <view v-else-if="activeScreen === 'checkupSetup'" class="checkupSetupScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="goBack">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">词汇体检</text>
      </view>

      <view class="checkupIntro">
        <text class="wordPickerTitle">{{ selectedUnit?.unitName }}</text>
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

    <view v-else-if="activeScreen === 'weakbook'" class="sectionStack weakbookScreen isSplitLayout">
      <view class="pageChrome">
        <view class="dictationNav">
          <view v-if="isRoutePage" class="navBack" @tap="goBack">
            <view class="chevronLeft" />
          </view>
          <text class="navTitle">生词本</text>
        </view>
      </view>

      <scroll-view scroll-y class="pageBodyScroll weakbookScroll" :show-scrollbar="false">
        <view v-if="savedWeakWords.length === 0" class="weakbookEmpty">
          <view class="weakbookEmptyIcon">生</view>
          <text class="weakbookEmptyTitle">暂无生词</text>
          <text class="weakbookEmptyText">体检或在线听写出错的单词，会自动进入生词本。</text>
        </view>

        <view v-else class="weakbookContent">
          <view class="weakbookSummary">
            <view class="weakbookSummaryTop">
              <view class="weakbookSummaryMain">
                <text class="weakbookSummaryLabel">待复习</text>
                <text class="weakbookSummaryCount">
                  {{ savedWeakWords.length }}<text class="weakbookSummaryUnit"> 个词</text>
                </text>
              </view>
              <view class="weakbookSelectToggle" @tap="allWeakWordsSelected ? clearWeakWordSelection() : selectAllWeakWords()">
                <text>{{ allWeakWordsSelected ? '取消全选' : '全选' }}</text>
              </view>
            </view>
            <text class="weakbookSummaryHint">已选 {{ selectedWeakWordCount }} 个 · 体检或听写正确后自动移出</text>
          </view>

          <view class="weakbookQuickActions">
            <view
              :class="['weakbookQuickAction', 'isPrimary', selectedWeakWordCount === 0 && 'isDisabled']"
              @tap="startSelectedWeakCheckupPage"
            >
              <text>体检</text>
            </view>
            <view
              :class="['weakbookQuickAction', 'isSecondary', selectedWeakWordCount === 0 && 'isDisabled']"
              @tap="openSelectedWeakDictationSetupPage"
            >
              <text>听写</text>
            </view>
            <view
              :class="['weakbookQuickAction', 'isMuted', selectedWeakWordCount === 0 && 'isDisabled']"
              @tap="markSelectedWeakWordsKnown"
            >
              <text>标记认识</text>
            </view>
          </view>

          <view class="weakbookWordList">
            <view
              v-for="word in savedWeakWords"
              :key="word.id"
              :class="['weakbookWordRow', isWeakWordSelected(word.id) && 'isSelected']"
              @tap="toggleWeakWordSelection(word.id)"
            >
              <view :class="['weakbookCheckDot', isWeakWordSelected(word.id) && 'isChecked']">
                <text v-if="isWeakWordSelected(word.id)">✓</text>
              </view>
              <view class="weakbookWordCopy">
                <view class="unitWordTitleRow">
                  <text class="weakWord">{{ word.word }}</text>
                  <text v-if="word.phonetic" class="unitWordPhonetic">{{ word.phonetic }}</text>
                </view>
                <text class="weakMeaning">{{ word.meaning }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="activeScreen === 'unitWords'" class="unitWordScreen isSplitLayout">
      <view class="pageChrome">
        <view class="dictationNav">
          <view class="navBack" @tap="goBack">
            <view class="chevronLeft" />
          </view>
          <text class="navTitle">全部单词</text>
        </view>
      </view>

      <scroll-view scroll-y class="pageBodyScroll" :show-scrollbar="false">
        <view class="unitWordHeader">
          <text class="unitWordTitle">{{ selectedUnit?.bookName }} {{ selectedUnit?.unitName }}</text>
          <text class="unitWordMeta">已掌握 {{ unitMasteryLabel }}</text>
          <text class="unitWordTip">标记认识后，该词不会进入体检和听写。</text>
        </view>

        <view class="unitWordList">
          <view
            v-for="item in sortedUnitWords"
            :key="`${item.word.id}:${isUnitWordMastered(item.word.id) ? 'mastered' : 'learning'}`"
            :class="['unitWordRow', isUnitWordMastered(item.word.id) && 'isMastered']"
          >
            <view class="unitWordCopy" @tap="openWordDetailPage(item.word.id)">
              <view class="unitWordTitleRow">
                <text class="unitWordEnglish">{{ item.word.word }}</text>
                <text v-if="item.word.phonetic" class="unitWordPhonetic">{{ item.word.phonetic }}</text>
              </view>
              <text class="unitWordMeaning">{{ item.word.meaning }}</text>
            </view>
            <view
              :class="['unitWordKnownButton', isUnitWordMastered(item.word.id) && 'isDone']"
              @tap.stop="markUnitWordKnown(item.word.id)"
            >
              <text class="unitWordKnownLabel">{{ isUnitWordMastered(item.word.id) ? '✓ 已掌握' : '认识' }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="activeScreen === 'wordDetail' && wordDetailEntry" class="wordDetailScreen isSplitLayout">
      <view class="pageChrome">
        <view class="wordDetailNav">
          <view class="navBack" @tap="goBack">
            <view class="chevronLeft" />
          </view>
          <text class="wordDetailProgress">{{ wordDetailProgressLabel }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="pageBodyScroll wordDetailScroll" :show-scrollbar="false">
        <view class="wordDetailHeroCard">
          <text class="wordDetailWord">{{ wordDetailEntry.word }}</text>
          <view v-if="wordDetailEntry.phonetic" class="wordDetailPhoneticRow">
            <view class="wordDetailPhoneticItem">
              <text class="wordDetailPhoneticLabel">英</text>
              <text class="wordDetailPhoneticText">{{ wordDetailEntry.phonetic }}</text>
              <view
                :class="['wordDetailSpeaker', wordDetailPlayingAccent === 'uk' && isAudioPlaying && 'isPlaying']"
                @tap="playWordDetailAudio('uk')"
              >
                <view class="wordDetailSpeakerIcon" />
              </view>
            </view>
            <view v-if="wordDetailEntry.usPhonetic && wordDetailHasUsAudio" class="wordDetailPhoneticItem">
              <text class="wordDetailPhoneticLabel">美</text>
              <text class="wordDetailPhoneticText">{{ wordDetailEntry.usPhonetic }}</text>
              <view
                :class="['wordDetailSpeaker', wordDetailPlayingAccent === 'us' && isAudioPlaying && 'isPlaying']"
                @tap="playWordDetailAudio('us')"
              >
                <view class="wordDetailSpeakerIcon" />
              </view>
            </view>
          </view>
        </view>

        <view class="wordDetailCard">
          <view class="wordDetailSectionTag">
            <text class="wordDetailSectionTagText">释义</text>
          </view>
          <text class="wordDetailMeaning">{{ wordDetailMeaningLabel }}</text>
        </view>

        <view v-if="wordDetailEntry.exampleSentence" class="wordDetailCard">
          <view class="wordDetailSectionHead">
            <view class="wordDetailSectionBar" />
            <text class="wordDetailSectionTitle">例句</text>
          </view>
          <view class="wordDetailExampleBody">
            <view class="wordDetailExampleCopy">
              <text class="wordDetailExampleText">
                <text
                  v-for="(part, index) in wordDetailExampleParts"
                  :key="`${part.text}-${index}`"
                  :class="part.highlight && 'wordDetailExampleHighlight'"
                >{{ part.text }}</text>
              </text>
              <text v-if="wordDetailEntry.exampleTranslation" class="wordDetailExampleTranslation">{{ wordDetailEntry.exampleTranslation }}</text>
            </view>
            <view
              :class="['wordDetailExampleSpeaker', isAudioPlaying && wordDetailPlayingAccent && 'isPlaying']"
              @tap="playWordDetailExampleAudio"
            >
              <view class="wordDetailSpeakerIcon" />
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="wordDetailFooter">
        <view
          :class="['wordDetailNextButton', !hasNextWordDetail && 'isDisabled']"
          @tap="goNextWordDetail"
        >
          <text class="wordDetailNextLabel">{{ hasNextWordDetail ? '下一词' : '已是本单元最后一个' }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="activeScreen === 'checkup' && currentCheckupQuestion" class="flowScreen isSplitLayout">
      <view class="pageChrome">
        <view class="playerHeader">
          <view class="playerHeaderTop">
            <view class="navBack" @tap="goBack">
              <view class="chevronLeft" />
            </view>
            <text class="playerTitle">词汇体检</text>
          </view>
          <text class="playerProgressMeta">{{ checkupProgressLabel }}</text>
          <view class="playerProgressTrack">
            <view class="playerProgressFill" :style="{ width: checkupProgressPercent + '%' }" />
          </view>
        </view>
      </view>

      <view v-if="recognitionState === 'correct'" class="celebrationLayer">
        <view
          v-for="piece in rewardParticles"
          :key="piece.id"
          :class="piece.className"
        />
      </view>

      <scroll-view scroll-y class="pageBodyScroll" :show-scrollbar="false">
        <view class="questionPanel">
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
      </scroll-view>

      <view v-if="recognitionState === 'correct'" class="feedbackBox success">
        <text class="feedbackTitle">选对了</text>
        <text class="feedbackText">正在进入拼写</text>
      </view>
    </view>

    <view v-else-if="activeScreen === 'spelling' && currentCheckupQuestion" class="flowScreen isSplitLayout">
      <view class="pageChrome">
        <view class="playerHeader">
          <view class="playerHeaderTop">
            <view class="navBack" @tap="goBack">
              <view class="chevronLeft" />
            </view>
            <text class="playerTitle">拼出单词</text>
          </view>
          <text class="playerProgressMeta">{{ checkupProgressLabel }}</text>
          <view class="playerProgressTrack">
            <view class="playerProgressFill" :style="{ width: checkupProgressPercent + '%' }" />
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

    <view v-else-if="activeScreen === 'report'" class="sectionStack reportScreen">
      <view class="dictationNav">
        <view class="navBack" @tap="goBack">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">体检报告</text>
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
        <view class="secondaryButton" @tap="startReportWeakCheckupPage">
          <text>再测一轮</text>
        </view>
      </view>
    </view>

    <view v-else-if="activeScreen === 'dictationSetup'" class="dictationSetupScreen">
      <view class="dictationNav">
        <view v-if="isRoutePage" class="navBack" @tap="goBack">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">自动听写</text>
      </view>

      <view class="dictationIntro">
        <text class="dictationIntroTitle">设置听写方式</text>
      </view>

      <view v-if="dictationInProgress" class="resumeDictationButton" @tap="resumeDictationPage">
        <view>
          <text class="resumeDictationTitle">继续上一次听写</text>
          <text class="resumeDictationMeta">从第 {{ dictationIndex + 1 }} / {{ dictationTotalCount }} 个词继续</text>
        </view>
        <text class="resumeDictationArrow">›</text>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">报词内容</text>
        <view class="pillRow">
          <view :class="['pill', dictationPrompt === 'chinese' && 'isActive']" @tap="setDictationPrompt('chinese')">
            <text>中文释义</text>
          </view>
          <view :class="['pill', dictationPrompt === 'english' && 'isActive']" @tap="setDictationPrompt('english')">
            <text>英文单词</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">每词间隔</text>
        <view class="pillRow">
          <view :class="['pill', dictationIntervalSeconds === 5 && 'isActive']" @tap="setDictationInterval(5)">
            <text>5 秒</text>
          </view>
          <view :class="['pill', dictationIntervalSeconds === 8 && 'isActive']" @tap="setDictationInterval(8)">
            <text>8 秒</text>
          </view>
          <view :class="['pill', dictationIntervalSeconds === 12 && 'isActive']" @tap="setDictationInterval(12)">
            <text>12 秒</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">播放顺序</text>
        <view class="pillRow">
          <view :class="['pill', dictationOrder === 'sequence' && 'isActive']" @tap="setDictationOrder('sequence')">
            <text>顺序</text>
          </view>
          <view :class="['pill', dictationOrder === 'shuffle' && 'isActive']" @tap="setDictationOrder('shuffle')">
            <text>乱序</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">重复次数</text>
        <view class="pillRow">
          <view :class="['pill', dictationRepeatCount === 1 && 'isActive']" @tap="setDictationRepeatCount(1)">
            <text>1 次</text>
          </view>
          <view :class="['pill', dictationRepeatCount === 2 && 'isActive']" @tap="setDictationRepeatCount(2)">
            <text>2 次</text>
          </view>
        </view>
      </view>

      <view class="settingGroup">
        <text class="settingLabel">听写方式</text>
        <view class="pillRow">
          <view :class="['pill', dictationMode === 'paper' && 'isActive']" @tap="setDictationMode('paper')">
            <text>纸笔默写</text>
          </view>
          <view :class="['pill', dictationMode === 'online' && 'isActive']" @tap="setDictationMode('online')">
            <text>在线输入</text>
          </view>
        </view>
      </view>

      <view class="dictationModeTip">
        <text>{{ dictationMode === 'paper' ? '手机负责报词，用纸笔完成默写。' : '在线输入会记录对错并同步生词本。' }}</text>
      </view>

      <view class="dictationContentCard" @tap="openDictationWordPickerPage">
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

    <view v-else-if="activeScreen === 'dictationWords'" class="dictationWordScreen isSplitLayout">
      <view class="pageChrome">
        <view class="dictationNav">
          <view class="navBack" @tap="backFromDictationWordPickerPage">
            <view class="chevronLeft" />
          </view>
          <text class="navTitle">选择单词</text>
        </view>
      </view>

      <scroll-view scroll-y class="pageBodyScroll" :show-scrollbar="false">
        <view class="wordPickerHeader">
          <text class="wordPickerTitle">{{ selectedUnit?.bookName }} {{ selectedUnit?.unitName }}</text>
          <text class="wordPickerMeta">已选 {{ selectedDictationWordCount }} / {{ dictationPickerWords.length }} 个词</text>
        </view>

        <view class="wordPickerToolbar">
          <view class="wordPickerScopePanel">
            <text class="wordPickerSectionLabel">听写范围</text>
            <view class="wordPickerScopeOptions">
              <view
                :class="['wordPickerScopeChip', dictationExcludesMasteredWords && 'isActive']"
                @tap="setDictationExcludeMasteredWords(true)"
              >
                <text>排除已掌握</text>
              </view>
              <view
                :class="['wordPickerScopeChip', !dictationExcludesMasteredWords && 'isActive', 'isIncluded']"
                @tap="setDictationExcludeMasteredWords(false)"
              >
                <text>包含已掌握</text>
              </view>
            </view>
          </view>

          <view class="quickPickPanel">
            <text class="quickPickLabel">帮我随机选</text>
            <view class="quickPickGroup">
              <view
                v-for="option in dictationQuickPickOptions"
                :key="option.id"
                :class="['quickPickButton', isDictationQuickOptionActive(option) && 'isActive']"
                @tap="applyDictationQuickOption(option)"
              >
                <text>{{ option.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="wordPickerList">
          <view
            v-for="item in dictationPickerRows"
            :key="item.key"
            :class="['wordPickRow', item.isSelected && 'isSelected']"
            @tap="toggleDictationWordSelection(item.word.id)"
          >
            <view class="wordPickCheck">
              <text v-if="item.isSelected">✓</text>
            </view>
            <view class="wordPickCopy">
              <view class="unitWordTitleRow">
                <text class="wordPickWord">{{ item.word.word }}</text>
                <text v-if="item.word.phonetic" class="unitWordPhonetic">{{ item.word.phonetic }}</text>
              </view>
              <text class="wordPickMeaning">{{ item.word.meaning }}</text>
            </view>
            <text v-if="isUnitWordMastered(item.word.id)" class="wordPickKnownBadge">已掌握</text>
            <text v-else class="wordPickLevel">L{{ item.word.difficulty }}</text>
          </view>
        </view>

        <view :class="['dictationStartButton wordPickerConfirm', selectedDictationWordCount === 0 && 'isDisabled']" @tap="confirmDictationWordSelectionPage">
          <text>确定 {{ selectedDictationWordCount }} 个词</text>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="activeScreen === 'dictation' && currentDictationEntry" class="dictationPlayerScreen isSplitLayout">
      <view class="pageChrome">
        <view class="playerHeader">
          <view class="playerHeaderTop">
            <view class="navBack" @tap="leaveDictationToSetupPage">
              <view class="chevronLeft" />
            </view>
            <text class="playerTitle">自动听写</text>
          </view>
          <text class="playerProgressMeta">{{ dictationProgressLabel }}</text>
          <view class="playerProgressTrack">
            <view class="playerProgressFill" :style="{ width: dictationProgressPercent + '%' }" />
          </view>
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
          <view :class="['transportButton', dictationIndex === 0 && 'isDisabled']" @tap="previousDictationPage">
            <view class="transportIcon previousIcon">
              <view class="previousBar" />
              <view class="previousTriangle" />
            </view>
            <text class="transportLabel">上一个</text>
          </view>
          <view class="transportButton isPrimary" @tap="toggleDictationPause">
            <view class="transportIcon">
              <view v-if="isAutoPaused" class="transportPlayTriangle" />
              <view v-else class="pauseBars">
                <view class="pauseBar" />
                <view class="pauseBar" />
              </view>
            </view>
            <text class="transportLabel">{{ isAutoPaused ? '继续' : '暂停' }}</text>
          </view>
          <view class="transportButton" @tap="skipCurrentDictation">
            <view class="transportIcon skipIcon">
              <view class="transportPlayTriangle" />
              <view class="skipBar" />
            </view>
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
          <view class="correctionLine">
            <text class="correctionWord">{{ currentDictationEntry.word }}</text>
            <text class="correctionMeaning">{{ currentDictationEntry.meaning }}</text>
          </view>
          <text v-if="currentDictationMarkedForgotten" class="feedbackText">已标记忘记，并加入生词本。</text>
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
      <view class="exitDictationButton" @tap="leaveDictationToSetupPage">
        <text>退出听写</text>
      </view>
    </view>

    <view v-else-if="activeScreen === 'dictationReport'" class="sectionStack reportScreen isSplitLayout">
      <view class="pageChrome">
        <view class="dictationNav">
          <view class="navBack" @tap="goBack">
            <view class="chevronLeft" />
          </view>
          <text class="navTitle">听写报告</text>
        </view>
      </view>

      <scroll-view scroll-y class="pageBodyScroll" :show-scrollbar="false">
        <view class="dictationReportPanel">
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

          <view class="dictationReviewList">
            <text class="blockTitle">本次听写清单</text>
            <view>
              <view
                v-for="item in dictationReviewItems"
                :key="item.word.id"
                :class="['dictationReviewRow', item.isForgotten ? 'isForgotten' : 'isMastered', 'hasStatus']"
              >
                <text class="reviewIndex">{{ item.index }}</text>
                <view class="reviewCopy">
                  <view class="unitWordTitleRow">
                    <text class="weakWord">{{ item.word.word }}</text>
                    <text v-if="item.word.phonetic" class="unitWordPhonetic">{{ item.word.phonetic }}</text>
                  </view>
                  <text class="weakMeaning">{{ item.word.meaning }}</text>
                </view>
                <view
                  :class="['reviewStatusButton', item.isForgotten ? 'isForgotten' : 'isMastered']"
                  @tap="toggleDictationReportWordStatus(item.word.id)"
                >
                  <text>{{ item.isForgotten ? '忘记' : '掌握' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="actionStack reportActions">
          <text class="confirmResultHint">确认后，未标记忘记的单词会标为已掌握；忘记的保留在生词本。</text>
          <view :class="['bottomButton confirmResultButton', dictationResultConfirmed && 'isDisabled']" @tap="confirmDictationResultPage">
            <text>{{ dictationResultConfirmed ? '已确认听写结果' : '确认听写结果' }}</text>
          </view>
          <view class="reportSecondaryActions">
            <view :class="['secondaryButton', dictationSummary.forgotten === 0 && 'isDisabled']" @tap="startForgottenDictationPage">
              <text>生词再听一轮</text>
            </view>
            <view class="secondaryButton" @tap="openWeakbook">
              <text>查看生词本</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="activeScreen === 'dictationReward' && dictationReward" class="dictationRewardScreen">
      <view class="rewardContent">
        <view class="rewardHero">
          <view class="rewardMedal" aria-hidden="true">
            <view class="rewardHalo" />
            <view class="rewardMedalCore">
              <text class="rewardMedalCoreText">{{ dictationReward.newlyMasteredCount > 0 ? `+${dictationReward.newlyMasteredCount}` : 'OK' }}</text>
            </view>
            <view class="rewardRay one" />
            <view class="rewardRay two" />
            <view class="rewardRay three" />
            <view class="rewardRay four" />
          </view>
          <view class="rewardSparkle one" />
          <view class="rewardSparkle two" />
          <view class="rewardSparkle three" />
          <text class="rewardTitle">{{ dictationRewardTitle }}</text>
          <text class="rewardSubtitle">{{ dictationRewardSubtitle }}</text>
        </view>

        <view class="rewardProgressCard">
          <view class="rewardProgressTop">
            <text>本单元词汇掌握进度</text>
            <text>{{ dictationReward.afterMastered }}/{{ unitWordCount }}</text>
          </view>
          <view class="rewardProgressTrack">
            <view class="rewardProgressFill" :style="{ width: rewardProgressPercent + '%' }" />
          </view>
          <text class="rewardProgressMeta">
            {{ dictationReward.newlyMasteredCount > 0 ? `本次新增 ${dictationReward.newlyMasteredCount} 个掌握词` : '本次已完成核对' }}
          </text>
        </view>

        <view class="rewardStatGrid">
          <view class="rewardStatCard gold">
            <view class="rewardStatHeader">
              <text>本次掌握</text>
            </view>
            <view class="rewardStatBody">
              <text class="rewardStatSymbol">+</text>
              <text class="rewardStatValue">{{ dictationReward.masteredCount }}</text>
            </view>
          </view>
          <view class="rewardStatCard green">
            <view class="rewardStatHeader">
              <text>正确率</text>
            </view>
            <view class="rewardStatBody">
              <text class="rewardStatSymbol">✓</text>
              <text class="rewardStatValue">{{ rewardAccuracy }}%</text>
            </view>
          </view>
          <view class="rewardStatCard blue">
            <view class="rewardStatHeader">
              <text>待巩固</text>
            </view>
            <view class="rewardStatBody">
              <text class="rewardStatSymbol">!</text>
              <text class="rewardStatValue">{{ dictationReward.forgottenCount }}</text>
            </view>
          </view>
        </view>

        <view :class="['rewardActions', dictationReward.forgottenCount > 0 && 'isDual']">
          <view v-if="dictationReward.forgottenCount > 0" class="rewardSecondaryButton" @tap="finishDictationRewardAndOpenWeakbook">
            <text>查看生词本</text>
          </view>
          <view class="rewardButton" @tap="finishDictationRewardAndReturnHome">
            <text>回到首页</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showBottomNav" class="bottomNav">
      <view class="bottomNavInner">
        <view :class="['bottomNavItem', activeScreen === 'home' && 'isActive']" @tap="goHome">
          <view class="bottomNavIconWrap">
            <image class="bottomNavIcon" :src="activeScreen === 'home' ? '/static/tabbar/home-active.png' : '/static/tabbar/home.png'" mode="aspectFit" />
          </view>
          <text class="bottomNavLabel">首页</text>
        </view>
        <view :class="['bottomNavItem', activeScreen === 'weakbook' && 'isActive']" @tap="goWeakbook">
          <view class="bottomNavIconWrap">
            <image class="bottomNavIcon" :src="activeScreen === 'weakbook' ? '/static/tabbar/weakbook-active.png' : '/static/tabbar/weakbook.png'" mode="aspectFit" />
          </view>
          <text class="bottomNavLabel">生词本</text>
          <text v-if="savedWeakWords.length > 0" class="bottomNavBadge">{{ savedWeakWords.length }}</text>
        </view>
        <view :class="['bottomNavItem', activeScreen === 'dictationSetup' && 'isActive']" @tap="goDictationSetup">
          <view class="bottomNavIconWrap">
            <image class="bottomNavIcon" :src="activeScreen === 'dictationSetup' ? '/static/tabbar/dictation-active.png' : '/static/tabbar/dictation.png'" mode="aspectFit" />
          </view>
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
import { getAudioUrl, hasPlayableAudio } from '@/core/audio'
import type { Accent } from '@/core/types'

const props = defineProps<{
  tabScreen?: 'home' | 'weakbook' | 'dictationSetup'
  routeScreen?: AppScreen
}>()

const choiceKeys = ['A', 'B', 'C', 'D']
const rewardParticles = [
  { id: 'p1', className: 'rewardParticle toneGold bar leftFar' },
  { id: 'p2', className: 'rewardParticle toneTeal dot leftMid' },
  { id: 'p3', className: 'rewardParticle toneBlue bar leftNear' },
  { id: 'p4', className: 'rewardParticle toneGold dot rightNear' },
  { id: 'p5', className: 'rewardParticle toneTeal bar rightMid' },
  { id: 'p6', className: 'rewardParticle toneRed dot rightFar' },
  { id: 'p7', className: 'rewardParticle toneBlue bar leftWide' },
  { id: 'p8', className: 'rewardParticle toneGold bar rightWide' },
  { id: 'p9', className: 'rewardParticle toneTeal dot leftSoft' },
  { id: 'p10', className: 'rewardParticle toneBlue dot rightSoft' }
]

const {
  activeWords,
  allDictationWordsSelected,
  allWeakWordsSelected,
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
  confirmDictationResult,
  confirmCourseSetup,
  courseSetupBookId,
  courseSetupBookOptions,
  courseSetupCanConfirm,
  courseSetupCompleted,
  courseSetupGrade,
  courseSetupGradeOptions,
  courseSetupPublisherId,
  courseSetupPublisherOptions,
  courseSetupStage,
  courseSetupStageOptions,
  courseSetupUnitId,
  courseSetupUnitOptions,
  currentCheckupQuestion,
  currentDictationEntry,
  dictationAudioReady,
  dictationAudioUrl,
  dictationIndex,
  dictationInProgress,
  dictationInput,
  dictationIntervalSeconds,
  dictationMode,
  dictationOrder,
  dictationPlan,
  dictationQuickPickOptions,
  dictationProgressLabel,
  dictationPrompt,
  dictationRecords,
  dictationReward,
  dictationResultConfirmed,
  dictationRepeatCount,
  dictationSummary,
  dictationTitle,
  dictationExcludesMasteredWords,
  dictationPickerDisplayWords,
  dictationPickerWords,
  effectiveCheckupLimit,
  finishDictationReward: finishDictationRewardInSession,
  hasNextWordDetail,
  isUnitWordMastered,
  markSelectedWeakWordsKnown,
  markCurrentDictationForgotten: markCurrentDictationForgottenInSession,
  markUnitWordKnown,
  masteredUnitWordCount,
  openDictationWordPicker,
  openCheckupSetup,
  openCourseSetup: openCourseSetupScreen,
  nextAfterWrong,
  nextWordDetail,
  openDictationSetup: openDictationSetupScreen,
  openSelectedWeakDictationSetup,
  openUnitWords,
  openWordDetail,
  openWeakbook: openWeakbookScreen,
  publisherOptions,
  quickSelectDictationWords,
  recognitionState,
  resetPractice: resetPracticeScreen,
  resumeDictation,
  screen,
  selectMeaning,
  selectAllDictationWords,
  selectAllWeakWords,
  selectedMeaning,
  selectedBookIndex,
  selectedDictationQuickCount,
  selectedPublisherIndex,
  selectedSchoolStageIndex,
  selectedUnit,
  selectedUnitQuickIndex,
  selectedDictationWordCount,
  selectedDictationWordIds,
  selectedWeakWordCount,
  selectedWeakWordIds,
  schoolStageOptions,
  savedWeakWords,
  setCheckupLimit,
  setCourseSetupBook,
  setCourseSetupGrade,
  setCourseSetupPublisher,
  setCourseSetupStage,
  setCourseSetupUnit,
  setDictationExcludeMasteredWords,
  showScreen,
  showDictationAnswer,
  spellingInput,
  startCheckup,
  startReportWeakCheckup,
  startSelectedWeakCheckup,
  startDictation,
  startForgottenDictation,
  submitDictationInput,
  submitSpelling,
  targetDictationWords,
  toggleDictationReportWordStatus,
  toggleDictationWordSelection,
  toggleWeakWordSelection,
  unitQuickOptions,
  unitLabel,
  unitMasteryLabel,
  unitMasteryPercent,
  unitWordCount,
  unitWords,
  unitWordsMasteredFirst,
  weakWords,
  nextDictation,
  previousDictation,
  wordDetailEntry,
  wordDetailProgressLabel,
} = usePracticeSession()

const wordDetailPlayingAccent = ref<Accent | null>(null)

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
const miniProgramNavTop = ref(16)
const miniProgramCapsuleTop = ref(28)
const miniProgramCapsuleHeight = ref(32)
const rewardProgressPercent = ref(0)

const screenStyle = computed(() => {
  // #ifdef MP-WEIXIN
  return `padding-top: ${miniProgramCapsuleTop.value}px;`
    + ` --capsule-top: ${miniProgramCapsuleTop.value}px;`
    + ` --capsule-h: ${miniProgramCapsuleHeight.value}px;`
    + ` --nav-top: ${miniProgramNavTop.value}px;`
  // #endif

  return ''
})

const TAB_ROOT_SCREENS = new Set<AppScreen>(['home', 'weakbook', 'dictationSetup'])

const ROUTE_BY_SCREEN: Partial<Record<AppScreen, string>> = {
  courseSetup: '/pages/course/index',
  unitWords: '/pages/unit-words/index',
  wordDetail: '/pages/word-detail/index',
  checkupSetup: '/pages/checkup/setup',
  checkup: '/pages/checkup/play',
  spelling: '/pages/checkup/spelling',
  report: '/pages/checkup/report',
  dictationSetup: '/pages/dictation/setup',
  dictationWords: '/pages/dictation/words',
  dictation: '/pages/dictation/player',
  dictationReport: '/pages/dictation/report',
  dictationReward: '/pages/dictation/reward'
}

const tabRootScreen = computed<AppScreen>(() => {
  if (!courseSetupCompleted.value) return 'courseSetup'
  if (props.tabScreen === 'weakbook') return 'weakbook'
  if (props.tabScreen === 'dictationSetup') return 'dictationSetup'
  return 'home'
})

const activeScreen = computed<AppScreen>(() => props.routeScreen ?? tabRootScreen.value)

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

const dictationPickerRows = computed(() => {
  const selectedSet = new Set(selectedDictationWordIds.value)

  return dictationPickerDisplayWords.value.map(word => {
    const isSelected = selectedSet.has(word.id)

    return {
      key: `${word.id}:${isSelected ? 'selected' : 'idle'}`,
      word,
      isSelected
    }
  })
})

const rewardAccuracy = computed(() => {
  if (!dictationReward.value || dictationReward.value.total <= 0) return 0
  return Math.round((dictationReward.value.masteredCount / dictationReward.value.total) * 100)
})

const dictationRewardTitle = computed(() => {
  if (!dictationReward.value) return ''
  if (dictationReward.value.allCorrect) return '太厉害了！'
  if (dictationReward.value.masteredCount > 0) return `掌握了 ${dictationReward.value.masteredCount} 个词`
  return '已经记录生词'
})

const dictationRewardSubtitle = computed(() => {
  if (!dictationReward.value) return ''
  if (dictationReward.value.allCorrect) {
    return `本次听写全对，掌握了 ${dictationReward.value.masteredCount} 个单词。`
  }
  if (dictationReward.value.forgottenCount > 0) {
    return `${dictationReward.value.forgottenCount} 个词已放入生词本，下一轮专门巩固。`
  }
  return '本次听写结果已同步到学习进度。'
})

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

const dictationReviewItems = computed(() => {
  return (dictationPlan.value?.words ?? []).map((word, index) => {
    const record = dictationRecordMap.value.get(word.id)
    const forgotten = record?.forgotten === true

    return {
      word,
      index: String(index + 1).padStart(2, '0'),
      isForgotten: forgotten
    }
  })
})

const dictationReportText = computed(() => {
  if (dictationSummary.value.wrong === 0) return '全部拼对，清单可用于复盘。'
  if (dictationSummary.value.forgotten > 0) {
    return `已标记 ${dictationSummary.value.forgotten} 个忘记，已加入生词本。`
  }
  return `有 ${dictationSummary.value.wrong} 个需要核对，已加入生词本。`
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
  if (targetDictationWords.value.length === unitWords.value.length) return unitLabel.value
  return `${selectedUnit.value?.bookName ?? '本单元'} ${selectedUnit.value?.unitName ?? ''} 自选词`
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
  // #ifdef MP-WEIXIN
  return !props.routeScreen && TAB_ROOT_SCREENS.has(activeScreen.value)
  // #endif
  return false
})

const isRoutePage = computed(() => Boolean(props.routeScreen))

const isSplitScreen = computed(() => (
  activeScreen.value === 'unitWords'
  || activeScreen.value === 'wordDetail'
  || activeScreen.value === 'dictationWords'
  || activeScreen.value === 'weakbook'
  || activeScreen.value === 'checkup'
  || activeScreen.value === 'spelling'
  || activeScreen.value === 'dictation'
  || activeScreen.value === 'dictationReport'
))

const sortedUnitWords = computed(() => {
  const items = unitWords.value.map(word => ({
    word,
    mastered: isUnitWordMastered(word.id)
  }))
  if (!unitWordsMasteredFirst.value) {
    return items
  }

  const unmastered = items.filter(item => !item.mastered)
  const mastered = items.filter(item => item.mastered)
  return [...mastered, ...unmastered]
})

const showAppHeader = computed(() => {
  return false
})

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
  if (screen.value === 'checkup') {
    redirectToRoute('checkup')
  }
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

function updateMiniProgramNavInset() {
  // #ifdef MP-WEIXIN
  const fallbackTop = 104

  try {
    const getMenuButton = (uni as unknown as {
      getMenuButtonBoundingClientRect?: () => { top?: number; bottom?: number; height?: number }
    }).getMenuButtonBoundingClientRect
    const getWindowInfo = (uni as unknown as {
      getWindowInfo?: () => { statusBarHeight?: number }
    }).getWindowInfo
    const menuButton = getMenuButton?.()
    const windowInfo = getWindowInfo?.()
    const menuTop = Number(menuButton?.top ?? 0)
    const menuBottom = Number(menuButton?.bottom ?? 0)
    const menuHeight = Number(menuButton?.height ?? 0)
    const statusBarHeight = Number(windowInfo?.statusBarHeight ?? 0)
    const calculatedTop = menuBottom > 0 ? menuBottom + 16 : statusBarHeight + 64

    miniProgramNavTop.value = Math.max(88, calculatedTop)
    miniProgramCapsuleTop.value = menuTop > 0
      ? menuTop
      : (statusBarHeight > 0 ? statusBarHeight + 4 : 28)
    miniProgramCapsuleHeight.value = menuHeight > 0 ? menuHeight : 32
  } catch {
    miniProgramNavTop.value = fallbackTop
    miniProgramCapsuleTop.value = 44
    miniProgramCapsuleHeight.value = 32
  }
  // #endif
}

function setDictationPrompt(value: 'chinese' | 'english') {
  dictationPrompt.value = value
}

function setDictationInterval(value: 5 | 8 | 12) {
  dictationIntervalSeconds.value = value
}

function setDictationOrder(value: 'sequence' | 'shuffle') {
  dictationOrder.value = value
}

function setDictationRepeatCount(value: 1 | 2) {
  dictationRepeatCount.value = value
}

function setDictationMode(value: 'paper' | 'online') {
  dictationMode.value = value
}

function syncNativeTabBar() {
  // #ifdef MP-WEIXIN
  // The native tabBar is replaced by an in-page custom nav (larger icons/labels),
  // so keep the native one hidden on every screen.
  try {
    uni.hideTabBar({ animation: false })
  } catch {
    // Native tabBar can be unavailable before tab pages mount.
  }
  return
  // #endif

  try {
    if (TAB_ROOT_SCREENS.has(activeScreen.value)) {
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

function syncNativeWeakbookBadge() {
  // #ifdef MP-WEIXIN
  try {
    const count = savedWeakWords.value.length
    if (count > 0) {
      uni.setTabBarBadge({
        index: 1,
        text: String(Math.min(count, 99))
      })
      return
    }

    uni.removeTabBarBadge({ index: 1 })
  } catch {
    // Native tabBar can be unavailable in H5 preview or before tab pages mount.
  }
  // #endif
}

function activateTabRoot() {
  if (!courseSetupCompleted.value) {
    openCourseSetupScreen()
    syncNativeTabBar()
    return
  }

  if (props.tabScreen === 'home') {
    resetPracticeScreen()
  } else if (props.tabScreen === 'weakbook') {
    openWeakbookScreen()
  } else if (props.tabScreen === 'dictationSetup') {
    openDictationSetupScreen()
  }

  syncNativeTabBar()
}

function activateRouteScreen(routeScreen: AppScreen) {
  showScreen(routeScreen)
  syncNativeTabBar()
}

function getCurrentRoutePath(): string {
  try {
    const pages = getCurrentPages()
    const route = pages[pages.length - 1]?.route
    return route ? `/${route}` : ''
  } catch {
    return ''
  }
}

function getPageStackLength(): number {
  try {
    return getCurrentPages().length
  } catch {
    return 0
  }
}

let pendingRedirectRoute = ''
let pendingPushedScreen: AppScreen | null = null

function navigateToRoute(nextScreen: AppScreen) {
  const url = ROUTE_BY_SCREEN[nextScreen]
  if (!url) {
    showScreen(nextScreen)
    return
  }

  if (getCurrentRoutePath() === url) {
    showScreen(nextScreen)
    return
  }

  uni.navigateTo({
    url,
    fail: () => showScreen(nextScreen)
  })
}

function redirectToRoute(nextScreen: AppScreen) {
  const url = ROUTE_BY_SCREEN[nextScreen]
  if (!url) {
    showScreen(nextScreen)
    return
  }

  if (getCurrentRoutePath() === url) {
    showScreen(nextScreen)
    return
  }

  if (pendingRedirectRoute === url) return
  pendingRedirectRoute = url

  uni.redirectTo({
    url,
    complete: () => {
      if (pendingRedirectRoute === url) pendingRedirectRoute = ''
    },
    fail: () => {
      pendingRedirectRoute = ''
      showScreen(nextScreen)
    }
  })
}

function navigateBackToPrevious(fallbackScreen: AppScreen = 'home') {
  if (getPageStackLength() > 1) {
    uni.navigateBack({
      delta: 1,
      fail: () => goToFallbackScreen(fallbackScreen)
    })
    return
  }

  goToFallbackScreen(fallbackScreen)
}

function goToFallbackScreen(fallbackScreen: AppScreen) {
  if (fallbackScreen === 'weakbook') {
    openWeakbook()
    return
  }

  if (fallbackScreen === 'dictationSetup') {
    openDictationSetup()
    return
  }

  if (fallbackScreen === 'unitWords') {
    openUnitWords()
    redirectToRoute('unitWords')
    return
  }

  resetPractice()
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

function openCourseSetupPage() {
  openCourseSetupScreen()
  navigateToRoute('courseSetup')
}

function openUnitWordsPage(masteredFirst = false) {
  openUnitWords(masteredFirst)
  navigateToRoute('unitWords')
}

function openWordDetailPage(wordId: string) {
  openWordDetail(wordId)
  navigateToRoute('wordDetail')
}

function goNextWordDetail() {
  if (!hasNextWordDetail.value) return
  nextWordDetail()
}

function splitExampleHighlight(sentence: string, word: string) {
  const parts: Array<{ text: string; highlight: boolean }> = []
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: sentence.slice(lastIndex, match.index), highlight: false })
    }
    parts.push({ text: match[0], highlight: true })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < sentence.length) {
    parts.push({ text: sentence.slice(lastIndex), highlight: false })
  }

  return parts.length > 0 ? parts : [{ text: sentence, highlight: false }]
}

const wordDetailMeaningLabel = computed(() => {
  const entry = wordDetailEntry.value
  if (!entry) return ''
  const pos = entry.partOfSpeech.trim()
  return pos ? `${pos} ${entry.meaning}` : entry.meaning
})

const wordDetailExampleParts = computed(() => {
  const entry = wordDetailEntry.value
  if (!entry?.exampleSentence) return []
  return splitExampleHighlight(entry.exampleSentence, entry.word)
})

const wordDetailHasUsAudio = computed(() => {
  const entry = wordDetailEntry.value
  return entry ? hasPlayableAudio(entry, 'us') : false
})

function playWordDetailExampleAudio() {
  const entry = wordDetailEntry.value
  if (!entry) return
  playWordDetailAudio(hasPlayableAudio(entry, 'us') ? 'us' : 'uk')
}

function playWordDetailAudio(accent: Accent) {
  const entry = wordDetailEntry.value
  if (!entry || !hasPlayableAudio(entry, accent)) {
    uni.showToast({
      title: '音频待生成',
      icon: 'none'
    })
    return
  }

  const url = getAudioUrl(entry, accent)
  const audio = ensureAudioContext(true)
  wordDetailPlayingAccent.value = accent
  audioRepeatsLeft = 1
  audioErrorShouldToast = true
  audio.stop()
  audio.src = url
  try {
    audio.seek(0)
  } catch {
    // Some H5 runtimes only allow seek after metadata is ready.
  }
  audio.play()
}

function openCheckupSetupPage() {
  openCheckupSetup()
  navigateToRoute('checkupSetup')
}

function openDictationSetupPage() {
  openDictationSetupScreen()
  navigateToRoute('dictationSetup')
}

function confirmCourseSetupPage() {
  confirmCourseSetup()
  resetPractice()
}

function startSelectedWeakCheckupPage() {
  startSelectedWeakCheckup()
  if (screen.value === 'checkup') {
    navigateToRoute('checkup')
  }
}

function startReportWeakCheckupPage() {
  startReportWeakCheckup()
  if (screen.value === 'checkup') {
    redirectToRoute('checkup')
  }
}

function openSelectedWeakDictationSetupPage() {
  openSelectedWeakDictationSetup()
  if (screen.value === 'dictationSetup') {
    navigateToRoute('dictationSetup')
  }
}

function openDictationWordPickerPage() {
  openDictationWordPicker()
  navigateToRoute('dictationWords')
}

function backFromDictationWordPickerPage() {
  backFromDictationWordPicker()
  navigateBackToPrevious('dictationSetup')
}

function confirmDictationWordSelectionPage() {
  confirmDictationWordSelection()
  navigateBackToPrevious('dictationSetup')
}

function confirmDictationResultPage() {
  confirmDictationResult()
}

function startForgottenDictationPage() {
  startForgottenDictation()
  if (screen.value === 'dictation') {
    redirectToRoute('dictation')
  }
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

function goBack(): boolean {
  switch (activeScreen.value) {
    case 'checkupSetup':
    case 'unitWords':
    case 'checkup':
    case 'spelling':
    case 'report':
      navigateBackToPrevious('home')
      return true
    case 'wordDetail':
      navigateBackToPrevious('unitWords')
      return true
    case 'dictation':
    case 'dictationReport':
    case 'dictationReward':
      navigateBackToPrevious('dictationSetup')
      return true
    case 'weakbook':
      resetPractice()
      return true
    case 'dictationWords':
      backFromDictationWordPickerPage()
      return true
    case 'dictationSetup':
      if (props.routeScreen) {
        navigateBackToPrevious('home')
        return true
      }
      return false
    case 'courseSetup':
      if (courseSetupCompleted.value) {
        navigateBackToPrevious('home')
        return true
      }
      return false
    default:
      return false
  }
}

function isWeakWordSelected(wordId: string): boolean {
  return selectedWeakWordIds.value.includes(wordId)
}

function isDictationWordSelected(wordId: string): boolean {
  return selectedDictationWordIds.value.includes(wordId)
}

function applyDictationQuickOption(option: { count: number, isAll: boolean }) {
  if (option.isAll) {
    selectAllDictationWords()
    return
  }

  quickSelectDictationWords(option.count)
}

function isDictationQuickOptionActive(option: { count: number, isAll: boolean }): boolean {
  if (option.isAll) return allDictationWordsSelected.value && selectedDictationQuickCount.value === null

  return selectedDictationQuickCount.value === option.count
    && selectedDictationWordCount.value === option.count
}

function finishDictationRewardAndReturnHome() {
  finishDictationRewardInSession()
  switchNativeTab('/pages/index/index')
}

function finishDictationRewardAndOpenWeakbook() {
  finishDictationRewardInSession()
  openWeakbook()
}

function beginDictation() {
  lastPlaybackKey = ''
  pendingPushedScreen = props.routeScreen ? 'dictation' : null
  startDictation()
  if (screen.value === 'dictation') {
    clearDictationTimers()
    navigateToRoute('dictation')
    return
  }
  pendingPushedScreen = null
}

function resumeDictationPage() {
  lastPlaybackKey = ''
  pendingPushedScreen = props.routeScreen ? 'dictation' : null
  resumeDictation()
  if (screen.value === 'dictation') {
    clearDictationTimers()
    navigateToRoute('dictation')
    return
  }
  pendingPushedScreen = null
}

function markCurrentDictationForgotten() {
  clearDictationTimers()
  stopActiveAudio()
  markCurrentDictationForgottenInSession()
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
  if (activeScreen.value !== 'dictation' || screen.value !== 'dictation' || !currentDictationEntry.value || !dictationAudioUrl.value) return ''
  return `${currentDictationEntry.value.id}|${dictationAudioUrl.value}|${dictationMode.value}`
}

function isWeixinDevtoolsRuntime(): boolean {
  // #ifdef MP-WEIXIN
  try {
    const getDeviceInfo = (uni as unknown as {
      getDeviceInfo?: () => { platform?: string }
    }).getDeviceInfo
    const platform = getDeviceInfo?.().platform
    return platform === 'devtools'
  } catch {
    return false
  }
  // #endif
  return false
}

function configureMiniProgramAudioPlayback() {
  // #ifdef MP-WEIXIN
  if (isWeixinDevtoolsRuntime()) return

  try {
    const audioApi = uni as unknown as {
      setInnerAudioOption?: (options: {
        obeyMuteSwitch?: boolean
        success?: () => void
        fail?: () => void
      }) => void
    }
    audioApi.setInnerAudioOption?.({
      obeyMuteSwitch: false,
      success: () => {},
      fail: () => {}
    })
  } catch {
    // Older runtimes may not expose setInnerAudioOption; the audio instance is configured below.
  }
  // #endif
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

  configureMiniProgramAudioPlayback()
  activeAudio = uni.createInnerAudioContext()
  const miniProgramAudio = activeAudio as unknown as { obeyMuteSwitch?: boolean }
  miniProgramAudio.obeyMuteSwitch = false
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
          wordDetailPlayingAccent.value = null
        }
      }, 180)
      return
    }
    audioRepeatsLeft = 0
    isAudioPlaying.value = false
    wordDetailPlayingAccent.value = null
  })
  activeAudio.onStop(() => {
    isAudioPlaying.value = false
    wordDetailPlayingAccent.value = null
  })
  activeAudio.onError(() => {
    isAudioPlaying.value = false
    wordDetailPlayingAccent.value = null
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
  if (dictationMode.value !== 'paper' || activeScreen.value !== 'dictation') return

  remainingSeconds.value = dictationPlan.value?.intervalSeconds ?? dictationIntervalSeconds.value
  countdownTimer = setInterval(() => {
    if (isAutoPaused.value) return
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)

    if (remainingSeconds.value > 0) return

    clearDictationTimers()
    nextDictation()
    if (activeScreen.value === 'dictation') {
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
  if (activeScreen.value === 'dictation') {
    startCurrentDictationPlayback()
  }
}

function previousDictationPage() {
  if (dictationIndex.value <= 0) return

  clearDictationTimers()
  stopActiveAudio()
  previousDictation()
  if (activeScreen.value === 'dictation') {
    startCurrentDictationPlayback()
  }
}

function leaveDictationToSetupPage() {
  clearDictationTimers()
  stopActiveAudio()
  navigateBackToPrevious('dictationSetup')
}

watch(
  () => [activeScreen.value, effectiveCheckupLimit.value],
  () => {
    if (activeScreen.value !== 'checkupSetup' || checkupLimitInputFocused.value) return

    checkupLimitDraft.value = String(effectiveCheckupLimit.value)
  },
  { immediate: true }
)

watch(
  () => screen.value,
  nextScreen => {
    syncNativeTabBar()

    if (!props.routeScreen) return
    if (pendingPushedScreen === nextScreen) {
      pendingPushedScreen = null
      return
    }
    if (nextScreen === props.routeScreen || TAB_ROOT_SCREENS.has(nextScreen)) return

    redirectToRoute(nextScreen)
  },
  { immediate: true }
)

watch(
  () => [activeScreen.value, dictationReward.value?.afterPercent],
  () => {
    if (activeScreen.value !== 'dictationReward' || !dictationReward.value) return

    rewardProgressPercent.value = dictationReward.value.beforePercent
    setTimeout(() => {
      if (activeScreen.value === 'dictationReward' && dictationReward.value) {
        rewardProgressPercent.value = dictationReward.value.afterPercent
      }
    }, 180)
  },
  { immediate: true }
)

watch(
  () => savedWeakWords.value.length,
  () => {
    syncNativeWeakbookBadge()
  },
  { immediate: true }
)

watch(
  () => [shellVisible.value, activeScreen.value, screen.value, currentDictationEntry.value?.id, dictationAudioUrl.value, dictationAudioReady.value, dictationMode.value],
  () => {
    if (!shellVisible.value) {
      clearDictationTimers()
      destroyActiveAudio()
      return
    }

    if (activeScreen.value !== 'dictation' || screen.value !== 'dictation') {
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
      if (activeScreen.value === 'dictation' && screen.value === 'dictation' && currentDictationEntry.value && dictationAudioReady.value) {
        startCurrentDictationPlayback()
      }
    }, 240)
  }
)

onShow(() => {
  updateMiniProgramNavInset()
  configureMiniProgramAudioPlayback()
  shellVisible.value = true
  if (props.routeScreen) {
    activateRouteScreen(props.routeScreen)
  } else {
    activateTabRoot()
  }
  syncNativeWeakbookBadge()
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
    uni.removeTabBarBadge({ index: 1 })
  } catch {
    // Ignore non-tab preview runtimes.
  }
})
</script>

<style lang="scss">
.screen {
  box-sizing: border-box;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(16px + env(safe-area-inset-top)) 18px calc(26px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #d4efe2 0%, #e8f5ee 22%, #f3f4f6 48%, #f3f4f6 100%) no-repeat;
  background-color: #f3f4f6;
}

.homeUnitCard,
.practiceItem,
.courseHero,
.coursePanel,
.courseConfirmButton,
.questionPanel,
.spellPanel,
.choiceItem,
.wrongActionBar,
.feedbackBox {
  box-sizing: border-box;
  max-width: 100%;
}

.screen.hasBottomNav {
  padding-bottom: calc(86px + env(safe-area-inset-bottom));
}

.screen.isSplitScreen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  background: #e8f5ee;
  background-color: #e8f5ee;
}

.isSplitLayout {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.pageChrome {
  flex: 0 0 auto;
  z-index: 30;
  padding-bottom: 8px;
  background: #e8f5ee;
}

.pageBodyScroll {
  flex: 1 1 auto;
  height: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  background: #e8f5ee;
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
.playerProgressMeta,
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
.dangerButton,
.bottomNavLabel,
.bottomNavBadge,
.weakbookEmptyTitle,
.weakbookEmptyText,
.weakbookSummaryLabel,
.weakbookSummaryCount,
.weakbookSummaryHint,
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
.weakList {
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
}

.questionPanel,
.spellPanel {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
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

.heroMetaChip {
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
.segment:active,
.weakbookWordRow:active,
.weakbookQuickAction:active,
.weakbookSelectToggle:active,
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
  padding: 4px 8px calc(4px + env(safe-area-inset-bottom));
  border-top: 1px solid #ececec;
  background: #fff;
  box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.04);
}

.bottomNavInner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  width: 100%;
  max-width: 420px;
}

.bottomNavItem {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 54px;
  padding: 6px 0 4px;
  border: 0;
  border-radius: 12px;
  color: #8e8e93;
  background: transparent;
  transition: color 160ms ease, transform 120ms ease;
}

.bottomNavItem.isActive {
  color: #1cb0f6;
}

.bottomNavIconWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.bottomNavIcon {
  width: 24px;
  height: 24px;
}

.bottomNavLabel {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.bottomNavItem.isActive .bottomNavLabel {
  font-weight: 700;
}

.bottomNavBadge {
  position: absolute;
  top: 2px;
  right: calc(50% - 24px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #ff4b4b;
  color: #fff;
  font-size: 9px;
  line-height: 12px;
  font-weight: 800;
  text-align: center;
}

.weakList {
  padding: 16px;
}

.weakbookScroll {
  padding: 0 16px 16px;
}

.weakbookContent {
  display: grid;
  gap: 12px;
}

.weakbookSummary {
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 18px;
  background: #fff;
}

.weakbookSummaryTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.weakbookSummaryMain {
  min-width: 0;
}

.weakbookSummaryLabel {
  display: block;
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
}

.weakbookSummaryCount {
  display: block;
  margin-top: 4px;
  color: #0d0f0e;
  font-size: 28px;
  line-height: 1;
  font-weight: 950;
}

.weakbookSummaryUnit {
  font-size: 14px;
  font-weight: 700;
  color: #8e8e93;
}

.weakbookSelectToggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #1cb0f6;
  font-size: 12px;
  font-weight: 800;
}

.weakbookSummaryHint {
  display: block;
  margin-top: 10px;
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
}

.weakbookQuickActions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.weakbookQuickAction {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 2px solid;
  border-bottom-width: 4px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  transition: transform 120ms ease, opacity 120ms ease;
}

.weakbookQuickAction.isPrimary {
  border-color: #46a302;
  background: #58cc02;
  color: #fff;
}

.weakbookQuickAction.isSecondary {
  border-color: #178ec8;
  background: #1cb0f6;
  color: #fff;
}

.weakbookQuickAction.isMuted {
  border-color: #d9d9d9;
  border-bottom-color: #c4c4c4;
  background: #fff;
  color: #555;
}

.weakbookQuickAction.isDisabled {
  border-color: #e5e5e5;
  border-bottom-color: #d9d9d9;
  background: #f1f1f1;
  color: #afafaf;
  opacity: 1;
  pointer-events: none;
}

.weakbookWordList {
  display: grid;
  gap: 8px;
}

.weakbookWordRow {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 64px;
  padding: 12px 14px;
  border: 2px solid transparent;
  border-radius: 14px;
  background: #fff;
  box-shadow: none;
}

.weakbookWordRow.isSelected {
  border-color: #5bc4f7;
  background: #d4efff;
}

.weakbookCheckDot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 2px solid #d9d9d9;
  border-radius: 999px;
  background: #fff;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.weakbookCheckDot.isChecked {
  border-color: #1cb0f6;
  background: #1cb0f6;
}

.weakbookWordCopy {
  min-width: 0;
}

.weakbookWordRow .weakWord {
  font-size: 18px;
  font-weight: 950;
}

.weakbookWordRow .weakMeaning {
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.weakbookEmpty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 32px 24px;
  text-align: center;
}

.weakbookEmptyIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #eef8ff;
  color: #1cb0f6;
  font-size: 28px;
  line-height: 1;
  font-weight: 900;
}

.weakbookEmptyTitle {
  display: block;
  margin-top: 16px;
  color: #0d0f0e;
  font-size: 20px;
  font-weight: 900;
}

.weakbookEmptyText {
  display: block;
  margin-top: 8px;
  color: #8e8e93;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 600;
}

.dangerButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  border: 1px solid #efb2b2;
  border-radius: 16px;
  background: #fff5f5;
  color: #ff4b4b;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 900;
  transition: transform 160ms ease, opacity 160ms ease;
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
  width: 11px;
  height: 11px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
  transform: rotate(45deg);
}

.flowTitle {
  flex: 1;
  min-width: 0;
  text-align: right;
}

.sectionStack > .flowHeader {
  position: relative;
  justify-content: center;
}

.sectionStack > .flowHeader .backButton {
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
}

.sectionStack > .flowHeader .flowTitle {
  flex: 0 1 auto;
  text-align: center;
}

.progressHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progressHeader .navBack {
  position: static;
  left: auto;
  top: auto;
  flex: 0 0 40px;
  transform: none;
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
  background: rgba(20, 80, 50, 0.12);
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
  overflow: visible;
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
  color: #ff4b4b;
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
  border-radius: 16px;
  background: #ff4b4b;
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
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  background: #fbfdfc;
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.choiceItem.isLocked {
  opacity: 0.46;
}

.choiceItem.isCorrect,
.choiceItem.isCorrectAnswer {
  opacity: 1;
  border-color: #58cc02;
  background: #d7ffb8;
}

.choiceItem.isCorrect {
  animation: answerPop 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  box-shadow: 0 14px 28px rgba(20, 116, 103, 0.14);
}

.choiceItem.isWrong {
  opacity: 1;
  border-color: #ff4b4b;
  background: #ffdfe0;
}

.choiceKey {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: #ddf4ff;
  color: #1cb0f6;
  font-size: 15px;
  font-weight: 900;
}

.choiceItem.isWrong .choiceKey {
  background: #ff4b4b;
  color: white;
}

.choiceItem.isCorrect .choiceKey,
.choiceItem.isCorrectAnswer .choiceKey {
  background: #58cc02;
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
  border-radius: 14px;
  background: #58cc02;
  color: white;
  font-size: 15px;
  font-weight: 900;
}

.choiceResult.wrong {
  background: #ff4b4b;
}

.celebrationLayer {
  position: fixed;
  left: 0;
  right: 0;
  top: 28%;
  bottom: 24%;
  z-index: 60;
  overflow: visible;
  pointer-events: none;
}

.celebrationLayer::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 42%;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(88, 204, 2, 0.32);
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(0.5);
  box-shadow: inset 0 0 0 12px rgba(88, 204, 2, 0.08);
  animation: successRing 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.rewardParticle {
  position: absolute;
  left: 50%;
  top: 42%;
  margin-left: -5px;
  margin-top: -5px;
  opacity: 0;
  box-shadow: 0 3px 8px rgba(16, 25, 23, 0.14);
  transform: translate(0, 0) scale(0.35);
  animation: confettiPop 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.rewardParticle.bar {
  width: 8px;
  height: 18px;
  border-radius: 6px;
}

.rewardParticle.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.rewardParticle.toneGold { background: #f4c861; }
.rewardParticle.toneTeal { background: #58cc02; }
.rewardParticle.toneBlue { background: #1cb0f6; }
.rewardParticle.toneRed { background: #ff4b4b; }

.rewardParticle.leftFar { animation-name: confettiLeftFar; animation-delay: 0ms; }
.rewardParticle.leftMid { animation-name: confettiLeftMid; animation-delay: 24ms; }
.rewardParticle.leftNear { animation-name: confettiLeftNear; animation-delay: 42ms; }
.rewardParticle.rightNear { animation-name: confettiRightNear; animation-delay: 18ms; }
.rewardParticle.rightMid { animation-name: confettiRightMid; animation-delay: 36ms; }
.rewardParticle.rightFar { animation-name: confettiRightFar; animation-delay: 54ms; }
.rewardParticle.leftWide { animation-name: confettiLeftWide; animation-delay: 66ms; }
.rewardParticle.rightWide { animation-name: confettiRightWide; animation-delay: 78ms; }
.rewardParticle.leftSoft { animation-name: confettiLeftSoft; animation-delay: 90ms; }
.rewardParticle.rightSoft { animation-name: confettiRightSoft; animation-delay: 102ms; }

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
  box-sizing: border-box;
  width: 100%;
  height: 52px;
  border-radius: var(--radius);
  white-space: nowrap;
  font-size: 17px;
  font-weight: 900;
  transition: transform 160ms ease, opacity 160ms ease;
}

.bottomButton {
  background: #58cc02;
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
  padding-bottom: 202px;
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
  height: 48px;
  border: 2px solid #84d8ff;
  border-bottom-width: 4px;
  border-radius: 14px;
  background: #fff;
  color: #1cb0f6;
  font-size: 14px;
  font-weight: 900;
}

.courseSetupScreen,
.checkupSetupScreen,
.dictationSetupScreen,
.dictationWordScreen,
.dictationPlayerScreen {
  min-height: 100vh;
  min-height: 100dvh;
  margin: calc(-16px - env(safe-area-inset-top)) -18px calc(-26px - env(safe-area-inset-bottom));
  padding: calc(14px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
  background: transparent;
  color: #0d0f0e;
}

.checkupSetupScreen,
.dictationSetupScreen,
.courseSetupScreen {
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
}

.courseSetupScreen {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.courseHero {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 2px;
  padding: 4px 4px 0;
}

.courseHeroKicker,
.courseHeroTitle,
.courseHeroText,
.courseSectionTitle,
.courseUnavailable,
.courseChipLabel,
.courseChipMeta,
.courseUnitName,
.courseUnitCount,
.courseUnitMastery,
.courseConfirmButton {
  display: block;
}

.courseHeroKicker {
  color: #1cb0f6;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 1px;
}

.courseHeroTitle {
  margin-top: 3px;
  color: #3c3c3c;
  font-size: 22px;
  line-height: 1.15;
  font-weight: 950;
  letter-spacing: -0.3px;
}

.courseHeroText {
  color: #afafaf;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 700;
}

.coursePanel {
  display: grid;
  gap: 14px;
  margin-top: 2px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.courseSection {
  display: grid;
  gap: 8px;
}

.courseSectionTitle {
  color: #afafaf;
  font-size: 11px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.courseChipGrid,
.courseUnitGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.courseChipGrid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.courseUnitGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.courseChip,
.courseUnitChip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 10px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 14px;
  background: #fff;
  color: #4b4b4b;
  box-shadow: none;
  text-align: center;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 800;
  transition: all 0.15s ease;
}

.courseChip.isActive,
.courseUnitChip.isActive {
  border-color: #84d8ff;
  border-bottom-color: #1cb0f6;
  background: #e8f6ff;
  color: #1cb0f6;
  font-weight: 900;
  box-shadow: none;
}

.courseChip.hasMeta {
  flex-direction: column;
  gap: 3px;
  min-height: 52px;
  padding: 7px 10px;
}

.courseChipLabel {
  line-height: 1.15;
}

.courseChipMeta {
  color: #58cc02;
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
}

.courseChip.isActive .courseChipMeta {
  color: #46a302;
}

.courseUnitChip {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  padding: 7px 10px;
  border-radius: 14px;
  text-align: center;
}

.courseUnitName {
  font-size: 15px;
  line-height: 1.1;
  font-weight: 900;
}

.courseUnitCount {
  color: #afafaf;
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
}

.courseUnitChip.isActive .courseUnitCount {
  color: #1cb0f6;
}

.courseUnitMastery {
  display: inline;
  color: #58cc02;
  font-weight: 800;
}

.courseUnitChip.isActive .courseUnitMastery {
  color: #46a302;
}

.courseUnavailable {
  min-height: 42px;
  padding: 13px 15px;
  border-radius: 14px;
  background: #f7f7f9;
  color: #a8abb2;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 500;
}

.courseConfirmButton {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 48px);
  max-width: 382px;
  height: 54px;
  border-radius: 16px;
  background: #58cc02;
  color: #fff;
  transform: translateX(-50%);
  box-shadow: inset 0 -5px #46a302;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.courseConfirmButton.isDisabled {
  pointer-events: none;
  background: #e5e5e5;
  color: #afafaf;
  box-shadow: inset 0 -5px #d9d9d9;
}

.dictationNav,
.playerHeaderTop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}

.playerHeaderTop .navBack {
  position: absolute;
  left: -4px;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
}

.playerHeaderTop .playerTitle {
  flex: 0 1 auto;
  text-align: center;
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
  width: 11px;
  height: 11px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
  border-radius: 0.5px;
  transform: rotate(45deg);
}

.navTitle,
.playerTitle {
  color: #1a1a1a;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 700;
}

.dictationIntro {
  margin-top: 6px;
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

.resumeDictationButton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  margin-top: 12px;
  padding: 12px 16px;
  border: 2px solid #84d8ff;
  border-bottom-width: 5px;
  border-radius: 18px;
  background: #ddf4ff;
  color: #1cb0f6;
}

.resumeDictationButton:active {
  transform: translateY(2px);
}

.resumeDictationTitle,
.resumeDictationMeta,
.resumeDictationArrow {
  display: block;
}

.resumeDictationTitle {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 950;
}

.resumeDictationMeta {
  margin-top: 4px;
  color: #777;
  font-size: 11px;
  font-weight: 800;
}

.resumeDictationArrow {
  flex: 0 0 auto;
  font-size: 28px;
  line-height: 1;
  font-weight: 950;
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
  border-color: #46a302;
  background: #58cc02;
  color: #fff;
}

.dictationContentCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding: 14px 16px;
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
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
  color: #c0c2c8;
  font-size: 22px;
  line-height: 1;
  font-weight: 400;
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
  margin-top: 10px;
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
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
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
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #777;
  font-size: 13px;
  font-weight: 950;
  box-shadow: none;
}

.checkupLimitOption.isActive {
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -3px #46a302;
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
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.wordPickerScopePanel,
.quickPickPanel {
  display: flex;
  border: 0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(60, 60, 60, 0.04);
}

.wordPickerScopePanel {
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
}

.wordPickerSectionLabel {
  flex: 0 0 auto;
  color: #8e9097;
  font-size: 13px;
  line-height: 1;
  font-weight: 950;
}

.wordPickerScopeOptions {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.wordPickerScopeChip {
  flex: 0 1 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6f7178;
  font-size: 13px;
  line-height: 1;
  font-weight: 950;
}

.wordPickerScopeChip.isActive {
  background: #e8f6ff;
  color: #1cb0f6;
  box-shadow: 0 0 0 1.5px #84d8ff;
}

.wordPickerScopeChip.isIncluded.isActive {
  background: #f0ffe5;
  color: #46a302;
  box-shadow: 0 0 0 1.5px #b8ef91;
}

.quickPickLabel {
  display: block;
  color: #7b7d83;
  font-size: 13px;
  line-height: 1;
  font-weight: 950;
}

.wordPickerHint {
  color: #9a9ca2;
  font-size: 13px;
  font-weight: 800;
}

.wordPickerList {
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin-top: 14px;
  padding-bottom: 86px;
  overflow: hidden;
}

.wordPickRow {
  display: flex;
  gap: 12px;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 78px;
  padding: 10px 12px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
  overflow: hidden;
}

.wordPickRow.isSelected {
  border-color: #84d8ff;
  background: #eef8ff;
}

.wordPickCheck {
  flex: 0 0 26px;
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
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.wordPickWord {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 55%;
  color: #0d0f0e;
  font-size: 16px;
  line-height: 1.15;
  font-weight: 950;
}

.wordPickCopy .unitWordTitleRow {
  min-width: 0;
  max-width: 100%;
  margin-bottom: 2px;
  overflow: hidden;
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
  flex: 0 0 30px;
  min-width: 0;
  color: #b0b2b8;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  text-align: right;
}

.wordPickKnownBadge {
  flex: 0 0 54px;
  box-sizing: border-box;
  max-width: 54px;
  padding: 5px 7px;
  border-radius: 999px;
  background: #f1f1f1;
  color: #777;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
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

.playerProgressMeta {
  display: block;
  margin-top: 4px;
  color: #8d8f96;
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
  text-align: center;
}

.playerProgressTrack {
  width: 100%;
  height: 10px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(20, 80, 50, 0.12);
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
  position: relative;
}

.transportButton.isPrimary .transportIcon {
  background: #0d0f0e;
}

.transportButton.isDisabled {
  pointer-events: none;
  opacity: 0.35;
}

.transportPlayTriangle {
  width: 0;
  height: 0;
  margin-left: 4px;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 15px solid #0d0f0e;
}

.transportButton.isPrimary .transportPlayTriangle {
  border-left-color: #fff;
}

.pauseBars {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pauseBar {
  width: 6px;
  height: 19px;
  border-radius: 999px;
  background: #fff;
}

.skipIcon {
  flex-direction: row;
  gap: 6px;
}

.skipBar {
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: #0d0f0e;
}

.previousIcon {
  flex-direction: row;
  gap: 5px;
}

.previousBar {
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: #0d0f0e;
}

.previousTriangle {
  width: 0;
  height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-right: 15px solid #0d0f0e;
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

.correctionLine {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  margin-top: 10px;
  padding: 11px 12px;
  border: 2px solid rgba(16, 25, 23, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.correctionWord,
.correctionMeaning {
  display: block;
}

.correctionWord {
  color: var(--ink);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 950;
}

.correctionMeaning {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.35;
  font-weight: 750;
}

.answerBox.danger .correctionLine {
  border-color: #ffb3b3;
  background: #fff;
}

.answerBox.danger .correctionWord,
.answerBox.danger .correctionMeaning {
  color: #d93636;
}

.answerBox.success .correctionLine {
  border-color: #9dd7ba;
  background: #fff;
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
  background: #58cc02;
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
  border: 1px solid #d9d9d9;
  border-radius: 16px;
  background: #fff;
  color: #0d0f0e;
  font-size: 16px;
  font-weight: 900;
}

.segment.isActive {
  border-color: #84d8ff;
  background: #ddf4ff;
  color: #1cb0f6;
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
  color: #147467;
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

@keyframes confettiPop {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(0, -120px) scale(1) rotate(120deg); }
  100% { opacity: 0; transform: translate(0, -90px) scale(0.86) rotate(200deg); }
}

@keyframes confettiLeftFar {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(-110px, -118px) scale(1.1) rotate(-160deg); }
  100% { opacity: 0; transform: translate(-110px, -96px) scale(0.86) rotate(-80deg); }
}

@keyframes confettiLeftMid {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(-72px, -142px) scale(0.95) rotate(124deg); }
  100% { opacity: 0; transform: translate(-72px, -118px) scale(0.82) rotate(200deg); }
}

@keyframes confettiLeftNear {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(-28px, -154px) scale(1) rotate(-112deg); }
  100% { opacity: 0; transform: translate(-28px, -132px) scale(0.84) rotate(-40deg); }
}

@keyframes confettiRightNear {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(22px, -160px) scale(0.9) rotate(150deg); }
  100% { opacity: 0; transform: translate(22px, -136px) scale(0.8) rotate(220deg); }
}

@keyframes confettiRightMid {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(68px, -138px) scale(1.05) rotate(132deg); }
  100% { opacity: 0; transform: translate(68px, -112px) scale(0.86) rotate(210deg); }
}

@keyframes confettiRightFar {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(112px, -104px) scale(0.95) rotate(200deg); }
  100% { opacity: 0; transform: translate(112px, -78px) scale(0.84) rotate(280deg); }
}

@keyframes confettiLeftWide {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(-118px, -58px) scale(1.05) rotate(-82deg); }
  100% { opacity: 0; transform: translate(-118px, -28px) scale(0.86) rotate(-10deg); }
}

@keyframes confettiRightWide {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(120px, -52px) scale(1.1) rotate(98deg); }
  100% { opacity: 0; transform: translate(120px, -20px) scale(0.86) rotate(170deg); }
}

@keyframes confettiLeftSoft {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(-44px, -86px) scale(0.8) rotate(-200deg); }
  100% { opacity: 0; transform: translate(-44px, -60px) scale(0.7) rotate(-120deg); }
}

@keyframes confettiRightSoft {
  0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
  14% { opacity: 1; }
  58% { opacity: 1; transform: translate(42px, -90px) scale(0.82) rotate(210deg); }
  100% { opacity: 0; transform: translate(42px, -64px) scale(0.72) rotate(280deg); }
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
  background: linear-gradient(180deg, #d4efe2 0%, #e8f5ee 22%, #f3f4f6 48%, #f3f4f6 100%) no-repeat;
  background-color: #f3f4f6;
  max-width: 100vw;
  overflow-x: hidden;
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

.heroMetaChip {
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
  padding: 4px 0 calc(4px + env(safe-area-inset-bottom));
  border-top: 1px solid #ececec;
  background: #fff;
  box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.04);
}

.bottomNavInner {
  gap: 0;
  max-width: 100%;
}

.bottomNavItem {
  min-height: 56px;
  border-radius: 0;
  color: #8e8e93;
}

.bottomNavItem.isActive {
  color: #1cb0f6;
}

.bottomNavLabel {
  font-size: 13px;
  font-weight: 600;
}

.bottomNavItem.isActive .bottomNavLabel {
  font-weight: 700;
}

.bottomNavBadge {
  top: 1px;
  right: calc(50% - 24px);
  min-width: 16px;
  height: 16px;
  border: 2px solid #fff;
  font-size: 9px;
  line-height: 12px;
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
  width: 13px;
  height: 13px;
  border: 0;
  border-left: 2.5px solid #b6b6be;
  border-bottom: 2.5px solid #b6b6be;
  border-radius: 1px;
  background: transparent;
  transform: rotate(45deg);
}

.flowHeader .backButton::after {
  content: none;
  display: none;
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
  height: 10px;
  border-radius: 999px;
  background: rgba(20, 80, 50, 0.12);
}

.progressFill,
.playerProgressFill {
  background: var(--accent);
  box-shadow: inset 0 -2px rgba(0, 0, 0, 0.12);
}

.questionPanel,
.spellPanel {
  flex: 1;
  padding: 0 2px 12px;
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
  padding: 22px 3px 8px;
  gap: 12px;
  overflow: visible;
}

.choiceItem {
  min-height: 58px;
  border: 2px solid #e8ebe9;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
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
  box-shadow: none;
}

.choiceItem.isCorrect .choiceKey,
.choiceItem.isCorrectAnswer .choiceKey {
  background: #58cc02;
}

.choiceItem.isWrong {
  border-color: #ff4b4b;
  background: #ffdfe0;
  box-shadow: none;
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
  width: auto;
  max-width: none;
  margin: 0;
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
  width: 100%;
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
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
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
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -5px #46a302;
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
.dictationPlayerScreen,
.courseSetupScreen,
.unitWordScreen {
  padding-right: 20px;
  padding-left: 20px;
}

.navBack .chevronLeft {
  width: 11px;
  height: 11px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
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
  border: 0;
  box-shadow: none;
}

.pill.isActive {
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -3px #46a302;
}

.dictationContentCard,
.checkupStat,
.wordPickRow,
.weakbookSummary,
.weakbookWordRow,
.weakList,
.reportHero {
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
}

.wordPickerList,
.wordPickRow {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.wordPickRow {
  border: 2px solid transparent;
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
  box-shadow: inset 0 -6px #46a302;
}

.wordPickRow.isSelected {
  border-color: #84d8ff;
  background: #e8f6ff;
  box-shadow: none;
}

.weakbookWordRow.isSelected {
  border-color: #5bc4f7;
  background: #d4efff;
  box-shadow: none;
}

.wordPickRow.isSelected .wordPickCheck,
.weakbookWordRow.isSelected .weakbookCheckDot {
  border-color: #1cb0f6;
  background: #1cb0f6;
}

.weakbookScroll {
  padding: 0 16px 16px;
}

.weakbookQuickActions {
  position: sticky;
  top: 0;
  z-index: 4;
  padding: 2px 0 4px;
  background: #e8f5ee;
}

.playerHeader {
  padding-top: 0;
}

.playerStage {
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
}

.dictationPlayerScreen.isSplitLayout > .playerStage {
  flex: 1 1 auto;
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
  background: #58cc02;
  box-shadow: inset 0 -5px #46a302;
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


.heroHint {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
}

.heroHintText {
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
  height: 38px;
  padding: 0 10px;
  border: 2px solid #e5e5e5;
  border-bottom: 4px solid #d9d9d9;
  border-radius: 999px;
  background: #fff;
  color: #6f7178;
  font-size: 13px;
  line-height: 1;
  font-weight: 950;
}

.quickPickPanel {
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.quickPickGroup {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.quickPickButton.isActive {
  border-color: #84d8ff;
  border-bottom-color: #1cb0f6;
  background: #ddf4ff;
  color: #1cb0f6;
}

.homeScreen {
  gap: 14px;
}

.homeHero {
  position: relative;
  z-index: 0;
  margin: -16px -18px 0;
  padding: 22px 22px 46px;
  background: linear-gradient(150deg, #58cc02 0%, #34c2f2 100%);
}

/* #ifdef H5 */
.homeHero {
  margin-top: calc(-16px - env(safe-area-inset-top));
  padding-top: calc(24px + env(safe-area-inset-top));
}
/* #endif */

/* #ifdef MP-WEIXIN */
.homeHero {
  margin-top: calc(-1 * var(--capsule-top, 44px));
  padding-top: calc(var(--capsule-top, 44px) + 6px);
}
/* #endif */

.homeHeroMain,
.homeHeroTags {
  position: relative;
  z-index: 1;
}

.homeHeroMain {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  width: 100%;
}

/* #ifdef MP-WEIXIN */
.homeHeroMain {
  padding-right: 96px;
}
/* #endif */

.homeHeroTitle {
  display: block;
  width: 100%;
  color: #fff;
  font-size: 32px;
  line-height: 1.15;
  font-weight: 950;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.homeHeroSubtitle {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding-left: 3px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.5;
  font-weight: 500;
}

.homeHeroTags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}

.homeHeroTag {
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
}

.homeUnitCard {
  position: relative;
  z-index: 1;
  overflow: hidden;
  margin-top: -30px;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(20, 40, 60, 0.08);
}

.homeUnitTopline,
.homeUnitRow,
.homeUnitTitle,
.homeUnitSubtitle,
.homeStatPrimary,
.homeStatSecondary,
.homeStatRow,
.homeUnitTip,
.homeActionHeader {
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
  margin-top: 10px;
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24px;
  line-height: 1.12;
  font-weight: 950;
}

.homeUnitSubtitle {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #afafaf;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 900;
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

.homeMasteryText {
  position: relative;
  z-index: 1;
}

.homeStatRow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 10px;
}

.homeStatPrimary,
.homeStatSecondary {
  gap: 9px;
  min-width: 0;
  min-height: 64px;
  padding: 12px;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 19px;
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
  font-size: 28px;
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

.homeSwitchRow {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  min-height: 54px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #f7f7f7;
  box-shadow: inset 0 -3px #e5e5e5;
}

.homeSwitchRow:active {
  transform: translateY(2px);
  filter: saturate(0.96);
}

.homeSwitchInfo {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.homeSwitchLabel {
  display: block;
  color: #afafaf;
  font-size: 10px;
  line-height: 1;
  font-weight: 900;
}

.homeSwitchValue {
  display: block;
  overflow: hidden;
  color: #3c3c3c;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.1;
  font-weight: 950;
}

.homeSwitchArrow {
  flex: 0 0 auto;
  color: #1cb0f6;
  font-size: 26px;
  line-height: 1;
  font-weight: 950;
}

.homeUnitTip {
  margin-top: 10px;
  color: #777;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 850;
}

.homeDictationStage {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 242px;
  padding: 0;
  overflow: visible;
}

.homeDictationEntry {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 236px;
  height: 236px;
  border-radius: 50%;
  background: rgba(221, 244, 255, 0.74);
  transition: transform 150ms ease;
}

.homeDictationRing {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 216px;
  height: 216px;
  border: 2px solid #84d8ff;
  border-radius: 50%;
  background: #f4fbff;
  box-sizing: border-box;
  animation: homeDictationBreathe 2800ms ease-in-out infinite;
}

.homeDictationButton {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 196px;
  height: 196px;
  border: 3px solid #0d9bd7;
  border-radius: 50%;
  background: #1cb0f6;
  box-shadow: inset 0 -10px #0d8fc7, 0 18px 34px rgba(28, 176, 246, 0.22);
  box-sizing: border-box;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.homeDictationEntry.isPressed {
  transform: translateY(4px) scale(0.985);
}

.homeDictationEntry.isPressed .homeDictationButton {
  box-shadow: inset 0 -5px #0d8fc7, 0 10px 22px rgba(28, 176, 246, 0.18);
  transform: translateY(3px);
}

.homeDictationIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 -4px #d7eef8;
}

.homeDictationIcon image {
  width: 40px;
  height: 40px;
}

.homeDictationTitle {
  display: block;
  margin-top: 17px;
  color: #fff;
  font-size: 29px;
  line-height: 1;
  font-weight: 950;
}

@keyframes homeDictationBreathe {
  0%,
  100% {
    transform: scale(0.985);
  }

  50% {
    transform: scale(1);
  }
}

@media (max-width: 390px), (max-height: 760px) {
  .homeDictationStage {
    min-height: 210px;
  }

  .homeDictationEntry {
    width: 204px;
    height: 204px;
  }

  .homeDictationRing {
    width: 188px;
    height: 188px;
  }

  .homeDictationButton {
    width: 172px;
    height: 172px;
    box-shadow: inset 0 -8px #0d8fc7, 0 14px 28px rgba(28, 176, 246, 0.2);
  }

  .homeDictationIcon {
    width: 52px;
    height: 52px;
  }

  .homeDictationIcon image {
    width: 32px;
    height: 32px;
  }

  .homeDictationTitle {
    margin-top: 13px;
    font-size: 24px;
  }
}

@media (max-height: 760px) {
  .homeScreen {
    gap: 8px;
  }

  .homeHero {
    padding-bottom: 30px;
  }

  .homeHeroTitle {
    font-size: 28px;
  }

  .homeHeroSubtitle {
    margin-top: 7px;
    font-size: 10px;
  }

  .homeHeroTags {
    gap: 5px;
    margin-top: 9px;
  }

  .homeHeroTag {
    padding: 4px 8px;
    font-size: 10px;
  }

  .homeUnitCard {
    margin-top: -24px;
    padding: 10px;
    border-radius: 18px;
  }

  .homeUnitLabel {
    padding: 4px 8px;
    font-size: 10px;
  }

  .homeUnitMeta,
  .homeUnitSubtitle {
    font-size: 10px;
  }

  .homeUnitTitle {
    margin-top: 6px;
    font-size: 20px;
  }

  .homeUnitRow,
  .homeStatRow,
  .homeSwitchRow {
    margin-top: 6px;
  }

  .homeMasteryPill {
    min-height: 30px;
    line-height: 30px;
  }

  .homeStatPrimary,
  .homeStatSecondary {
    min-height: 48px;
    padding: 7px 9px;
    border-radius: 16px;
  }

  .homeStatNumber {
    font-size: 23px;
  }

  .homeSwitchRow {
    min-height: 40px;
    padding: 7px 10px;
  }

  .homeSwitchValue {
    font-size: 12px;
  }
}

@media (max-width: 350px), (max-height: 680px) {
  .homeDictationStage {
    min-height: 186px;
  }

  .homeDictationEntry {
    width: 180px;
    height: 180px;
  }

  .homeDictationRing {
    width: 166px;
    height: 166px;
  }

  .homeDictationButton {
    width: 150px;
    height: 150px;
  }

  .homeDictationIcon {
    width: 46px;
    height: 46px;
  }

  .homeDictationIcon image {
    width: 28px;
    height: 28px;
  }

  .homeDictationTitle {
    margin-top: 10px;
    font-size: 21px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .homeDictationEntry,
  .homeDictationButton {
    transition: none;
  }

  .homeDictationRing {
    animation: none;
  }
}

.unitWordScreen {
  min-height: 100vh;
  min-height: 100dvh;
  margin: calc(-16px - env(safe-area-inset-top)) -18px calc(-26px - env(safe-area-inset-bottom));
  padding: calc(14px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
  background: transparent;
}

.unitWordHeader {
  margin-top: 12px;
  padding: 4px 2px 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
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
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 10px;
  align-items: center;
  min-height: 66px;
  padding: 12px 14px;
  border: 2px solid #ececec;
  border-bottom-width: 3px;
  border-bottom-color: #dedede;
  border-radius: 14px;
  background: #fff;
  box-shadow: none;
}

.unitWordRow.isMastered {
  border-color: #c5f0a8;
  border-bottom-color: #58cc02;
  background: #f7fcf4;
}

.unitWordCopy {
  min-width: 0;
}

.unitWordTitleRow {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.unitWordTitleRow .unitWordEnglish,
.unitWordTitleRow .wordPickWord,
.unitWordTitleRow .weakWord,
.unitWordTitleRow .unitWordPhonetic {
  display: inline;
}

.unitWordEnglish,
.unitWordPhonetic,
.unitWordMeaning,
.wordPickWord {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitWordEnglish {
  flex: 0 1 auto;
  max-width: 55%;
  color: #111;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 950;
}

.unitWordPhonetic {
  flex: 1 1 auto;
  min-width: 0;
  margin-top: 0;
  color: #8d8f96;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 750;
}

.unitWordMeaning {
  display: block;
  margin-top: 5px;
  color: #8d8f96;
  font-size: 13px;
  font-weight: 850;
}

.unitWordKnownButton {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 4px;
  border-radius: 14px;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -4px #46a302;
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
}

.unitWordKnownButton.isDone {
  background: #e9ffe0;
  color: #46a302;
  border: 2px solid #58cc02;
  border-bottom-width: 3px;
  border-bottom-color: #46a302;
  box-shadow: none;
  font-size: 12px;
}

.unitWordKnownLabel {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: 1;
}

.checkupStatEditable {
  position: relative;
  border: 0;
  background: #e8f6ff;
  box-shadow: 0 0 0 1.5px #84d8ff;
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
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  background: #fff5f5;
  box-shadow: 0 1px 3px rgba(217, 54, 54, 0.06);
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
  padding-top: 4px;
  border-top: 1px solid #eef1ef;
}

.dictationReviewList .blockTitle {
  margin-top: 2px;
  color: #3c3c3c;
  font-size: 15px;
  font-weight: 900;
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

.dictationReviewRow.isForgotten {
  border-color: #ffb3b3;
  background: #fff5f5;
}

.dictationReviewRow.isMastered {
  border-color: #b8ef91;
  background: #f5ffef;
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

.dictationReviewRow.isForgotten .reviewIndex {
  background: #ff4b4b;
  color: #fff;
}

.dictationReviewRow.isMastered .reviewIndex {
  background: #58cc02;
  color: #fff;
}

.dictationReviewRow.isForgotten .weakWord,
.dictationReviewRow.isForgotten .weakMeaning {
  color: #d93636;
}

.dictationReviewRow.isMastered .weakWord {
  color: #2f7d00;
}

.dictationReportPanel {
  display: grid;
  gap: 14px;
  margin-top: 4px;
  margin-bottom: 14px;
  padding: 14px 15px 16px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
}

.reportScreen .reportActions {
  margin-top: 4px;
}

.reportScreen.isSplitLayout .pageBodyScroll {
  padding: 0 16px 16px;
  box-sizing: border-box;
}

.reportScreen.isSplitLayout .reportActions {
  width: 100%;
  max-width: 100%;
  padding: 0 2px 8px;
  box-sizing: border-box;
}

.dictationSummaryCard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
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
  background: transparent;
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

.reviewStatusButton {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  min-width: 52px;
  height: 32px;
  padding: 0 10px;
  border: 2px solid transparent;
  border-bottom-width: 4px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

.reviewStatusButton.isForgotten {
  border-color: #ffb3b3;
  background: #ff4b4b;
  color: #fff;
  box-shadow: inset 0 -3px #d93636;
}

.reviewStatusButton.isMastered {
  border-color: #b8ef91;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -3px #46a302;
}

.confirmResultHint {
  display: block;
  color: #8e9097;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 800;
  text-align: center;
}

.reportActions .confirmResultButton {
  box-sizing: border-box;
  height: 56px;
  border: 0;
  border-radius: 16px;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -5px #46a302;
  font-size: 17px;
}

.reportSecondaryActions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.reportSecondaryActions .secondaryButton {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 8px;
  border: 2px solid #84d8ff;
  border-bottom-width: 4px;
  border-radius: 14px;
  background: #fff;
  color: #1cb0f6;
  box-shadow: none;
  font-size: 14px;
  font-weight: 900;
}

.dictationRewardScreen {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  min-height: auto;
  padding: 34px 0 22px;
}

.rewardContent {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  max-width: 392px;
  margin: 0 auto;
}

.rewardHero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: auto;
  padding-top: 0;
  text-align: center;
}

.rewardMedal {
  position: relative;
  width: 136px;
  height: 136px;
  animation: rewardPop 520ms cubic-bezier(0.2, 1.5, 0.3, 1) both;
}

.rewardHalo {
  position: absolute;
  inset: 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #e9ffe0 0%, #ddf4ff 100%);
  box-shadow: inset 0 0 0 8px rgba(255, 255, 255, 0.72), 0 18px 34px rgba(28, 176, 246, 0.12);
}

.rewardMedalCore {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -10px #46a302, 0 14px 28px rgba(88, 204, 2, 0.22);
  transform: translate(-50%, -50%);
}

.rewardMedalCoreText {
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
}

.rewardRay {
  position: absolute;
  width: 28px;
  height: 8px;
  border-radius: 999px;
  background: #ffc800;
  opacity: 0;
  animation: rewardRayBurst 820ms ease-out 100ms both;
}

.rewardRay.one {
  left: 4px;
  top: 70px;
  transform: rotate(0deg);
}

.rewardRay.two {
  right: 4px;
  top: 70px;
  transform: rotate(0deg);
}

.rewardRay.three {
  left: 54px;
  top: 4px;
  transform: rotate(90deg);
}

.rewardRay.four {
  left: 54px;
  bottom: 4px;
  transform: rotate(90deg);
}

.rewardSparkle {
  position: absolute;
  width: 18px;
  height: 18px;
  background: #b8ef91;
  transform: rotate(45deg) scale(0);
  animation: rewardSparkle 1100ms ease-out both;
}

.rewardSparkle.one {
  left: 42px;
  top: 112px;
}

.rewardSparkle.two {
  right: 48px;
  top: 96px;
  animation-delay: 120ms;
}

.rewardSparkle.three {
  right: 74px;
  top: 188px;
  width: 14px;
  height: 14px;
  animation-delay: 220ms;
}

.rewardTitle {
  display: block;
  max-width: 330px;
  margin-top: 20px;
  color: #ffc800;
  font-size: 32px;
  line-height: 1.08;
  font-weight: 950;
  text-align: center;
}

.rewardSubtitle {
  display: block;
  max-width: 332px;
  margin-top: 10px;
  color: #8e9097;
  font-size: 17px;
  line-height: 1.42;
  font-weight: 850;
  text-align: center;
}

.rewardProgressCard,
.rewardStatCard {
  box-sizing: border-box;
  border: 2px solid #e5e5e5;
  border-bottom-width: 5px;
  background: #fff;
}

.rewardProgressCard {
  box-sizing: border-box;
  width: 100%;
  margin: 28px 0 0;
  padding: 16px;
  border-radius: 22px;
}

.rewardProgressTop {
  display: flex;
  justify-content: space-between;
  color: #3c3c3c;
  font-size: 15px;
  line-height: 1;
  font-weight: 950;
}

.rewardProgressTrack {
  overflow: hidden;
  height: 16px;
  margin-top: 12px;
  border-radius: 999px;
  background: #e5e5e5;
}

.rewardProgressFill {
  height: 100%;
  border-radius: inherit;
  background: #58cc02;
  transition: width 1100ms cubic-bezier(0.16, 1, 0.3, 1);
}

.rewardProgressMeta {
  display: block;
  margin-top: 10px;
  color: #8e9097;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 850;
}

.rewardStatGrid {
  display: flex;
  box-sizing: border-box;
  gap: 10px;
  width: 100%;
  margin: 16px 0 0;
}

.rewardStatCard {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  min-height: 98px;
  padding: 0 8px 10px;
  border-radius: 18px;
}

.rewardStatCard.gold {
  border-color: #ffd76b;
}

.rewardStatCard.green {
  border-color: #b8ef91;
}

.rewardStatCard.blue {
  border-color: #84d8ff;
}

.rewardStatHeader {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  height: 30px;
  margin: 0 -8px 8px;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

.rewardStatCard.gold .rewardStatHeader {
  background: #ffc800;
}

.rewardStatCard.green .rewardStatHeader {
  background: #58cc02;
}

.rewardStatCard.blue .rewardStatHeader {
  background: #1cb0f6;
}

.rewardStatBody {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
}

.rewardStatSymbol {
  color: currentColor;
  font-size: 20px;
  line-height: 1;
  font-weight: 950;
}

.rewardStatValue {
  color: currentColor;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}

.rewardStatCard.gold .rewardStatBody {
  color: #ffc800;
}

.rewardStatCard.green .rewardStatBody {
  color: #58cc02;
}

.rewardStatCard.blue .rewardStatBody {
  color: #1cb0f6;
}

.rewardButton {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 58px;
  border-radius: 18px;
  background: #1cb0f6;
  color: #fff;
  box-shadow: inset 0 -5px #0a84d8;
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
}

.rewardActions {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  gap: 10px;
  width: 100%;
  margin: 20px 0 0;
}

.rewardActions.isDual {
  flex-direction: row;
}

.rewardActions.isDual .rewardButton,
.rewardActions.isDual .rewardSecondaryButton {
  flex: 1 1 0;
  min-width: 0;
}

.rewardSecondaryButton {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 58px;
  border: 2px solid #84d8ff;
  border-bottom-width: 5px;
  border-radius: 18px;
  background: #fff;
  color: #1cb0f6;
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
}

@keyframes rewardPop {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.76);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes rewardRayBurst {
  0% {
    opacity: 0;
  }
  42% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes rewardSparkle {
  0% {
    opacity: 0;
    transform: rotate(45deg) scale(0);
  }
  38% {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(45deg) scale(0.64);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewardMedal,
  .rewardRay,
  .rewardSparkle,
  .rewardProgressFill {
    animation: none;
    transition: none;
  }
}

/* #ifdef MP-WEIXIN */
.screen {
  max-width: none;
  min-height: 100vh;
  padding-right: 18px;
  padding-bottom: 26px;
  padding-left: 18px;
  overflow-x: hidden;
}

.screen.hasBottomNav {
  padding-bottom: calc(86px + env(safe-area-inset-bottom));
}

.courseSetupScreen,
.checkupSetupScreen,
.dictationSetupScreen,
.dictationWordScreen,
.dictationPlayerScreen,
.unitWordScreen {
  box-sizing: border-box;
  min-height: auto;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 0 24px;
  overflow-x: hidden;
  background: transparent;
}

.checkupSetupScreen,
.dictationSetupScreen,
.courseSetupScreen {
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}

.courseConfirmButton {
  right: 18px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 18px;
  width: auto;
  max-width: none;
  transform: none;
}

.dictationNav {
  position: relative;
  min-height: var(--capsule-h, 32px);
  margin-bottom: 8px;
  justify-content: center;
  padding-right: 0;
  padding-left: 0;
  box-sizing: border-box;
}

.pageChrome {
  margin: 0 -18px;
  padding-right: 18px;
  padding-left: 18px;
  background: #e8f5ee;
}

.pageChrome .dictationNav,
.pageChrome .playerHeader,
.pageChrome .playerHeaderTop {
  background: transparent;
}

.pageChrome .playerHeader {
  margin-bottom: 6px;
}

.pageChrome .playerProgressTrack {
  margin-top: 8px;
  background: rgba(70, 163, 2, 0.18);
}

.screen.isSplitScreen .pageChrome,
.screen.isSplitScreen .pageBodyScroll {
  background: #e8f5ee;
}

.playerHeaderTop {
  position: relative;
  min-height: var(--capsule-h, 32px);
  margin-bottom: 4px;
  justify-content: center;
  padding-right: 0;
  padding-left: 0;
  box-sizing: border-box;
}

.playerHeaderTop .navBack {
  position: absolute;
  left: -4px;
  top: 50%;
  z-index: 1;
  flex: 0 0 44px;
  margin-right: 0;
  transform: translateY(-50%);
}

.playerHeaderTop .playerTitle {
  flex: 0 1 auto;
  max-width: calc(100% - 96px);
  text-align: center;
}

.sectionStack > .flowHeader {
  position: relative;
  min-height: var(--capsule-h, 32px);
  margin-bottom: 6px;
  justify-content: center;
  padding-right: 0;
  box-sizing: border-box;
}

.sectionStack > .flowHeader .backButton {
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 1;
  flex: 0 0 auto;
  transform: translateY(-50%);
}

.sectionStack > .flowHeader .flowTitle {
  flex: 0 1 auto;
  min-width: 0;
  text-align: center;
}

.navTitle {
  display: block;
  min-width: 0;
  font-size: 18px;
  font-weight: 950;
  text-align: center;
}

.playerTitle {
  display: block;
  flex: 0 1 auto;
  min-width: 0;
  font-size: 18px;
  font-weight: 950;
  text-align: center;
}

.playerProgressText {
  flex: 0 0 auto;
  color: #9a9ca2;
  font-size: 13px;
  font-weight: 850;
}

.flowScreen {
  min-height: auto;
  padding-bottom: 24px;
  gap: 10px;
}

.flowHeader {
  min-height: 44px;
  margin-bottom: 14px;
}

.progressHeader {
  align-items: center;
  gap: 8px;
}

.progressHeader .navBack {
  position: static;
  left: auto;
  top: auto;
  flex: 0 0 40px;
  transform: none;
}

.questionPanel,
.spellPanel {
  flex: 0 0 auto;
  min-height: 0;
  padding: 0;
}

.questionPanel {
  display: block;
}

.wordTitle {
  margin-top: 24px;
  font-size: 48px;
  line-height: 1.02;
}

.phonetic {
  margin-top: 10px;
  font-size: 16px;
}

.choiceList {
  display: grid;
  margin-top: 42px;
  padding: 2px 3px 10px;
  gap: 12px;
  overflow: visible;
}

.choiceItem {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 42px;
  gap: 12px;
  align-items: center;
  min-height: 62px;
  padding: 10px 14px;
  border: 2px solid #e8ebe9;
  box-sizing: border-box;
}

.choiceResult {
  justify-self: end;
}

.checkupIntro {
  margin-top: 8px;
}

.checkupStatGrid {
  gap: 10px;
  margin-top: 22px;
}

.checkupLimitOptions {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.checkupLimitOption.isActive {
  border-color: #46a302;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -4px #46a302;
}

.checkupSetupScreen > .dictationStartButton,
.dictationSetupScreen > .dictationStartButton {
  position: static;
  width: 100%;
  max-width: none;
  height: 58px;
  margin-top: 22px;
  transform: none;
}

.dictationSetupScreen {
  display: flex;
  flex-direction: column;
}

.dictationSetupScreen .dictationIntro {
  margin-top: 18px;
}

.dictationSetupScreen .dictationIntroTitle {
  font-size: 30px;
  line-height: 1.08;
}

.dictationSetupScreen .settingGroup {
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 10px 12px;
  margin-top: 14px;
}

.dictationSetupScreen .settingLabel {
  font-size: 14px;
}

.dictationSetupScreen .pillRow {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 9px;
}

.dictationSetupScreen .pill {
  min-width: 62px;
  height: 36px;
  padding: 0 13px;
  border-color: transparent;
  background: #f3f3f6;
  color: #9a9ca2;
  font-size: 14px;
}

.dictationSetupScreen .pill.isActive {
  border-color: #46a302;
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -4px #46a302;
}

.dictationModeTip {
  margin-top: 10px;
  margin-left: 90px;
  padding: 10px 12px;
  font-size: 13px;
}

.dictationSetupScreen .dictationContentCard {
  margin-top: 18px;
  padding: 14px 15px;
}

.wordPickerToolbar {
  align-items: stretch;
}

.wordPickerList,
.wordPickRow {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.wordPickRow {
  border: 2px solid transparent;
  padding-right: 12px;
  padding-left: 12px;
}

.wordPickCopy {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.wordPickKnownBadge {
  flex: 0 0 54px;
  max-width: 54px;
}

.quickPickButton.isActive {
  border-color: #1cb0f6;
  background: #ddf4ff;
  color: #1cb0f6;
  box-shadow: inset 0 -4px #84d8ff;
}

.bottomButton,
.dictationStartButton {
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -5px #46a302;
}

.secondaryButton {
  border-color: #e5e5e5;
  background: #fff;
  color: #1cb0f6;
}

.dangerButton {
  border-color: #ffb3b3;
  background: #fff5f5;
  color: #ff4b4b;
}

.miniPill {
  background: #0d0f0e;
  color: #fff;
}

.excludeKnownPill {
  min-width: 98px;
  background: #ddf4ff;
  color: #1cb0f6;
  box-shadow: inset 0 -4px #84d8ff;
}

.excludeKnownPill.isIncluded {
  background: #ddf4ff;
  color: #1cb0f6;
  box-shadow: inset 0 -4px #84d8ff;
}

.excludeKnownPill.isExcluded {
  background: #f7f7f7;
  color: #777;
  box-shadow: inset 0 -4px #d9d9d9, inset 0 0 0 2px #e5e5e5;
}

.weakbookQuickActions {
  position: static;
  top: auto;
  padding: 0;
  background: transparent;
}

.weakbookQuickAction {
  border-bottom-width: 5px;
}

.wordPickRow.isSelected {
  border-color: #84d8ff;
  background: #e8f6ff;
  box-shadow: none;
}

.weakbookWordRow.isSelected {
  border-color: #5bc4f7;
  background: #d4efff;
  box-shadow: none;
}

.weakbookWordRow.isSelected .weakbookCheckDot,
.wordPickRow.isSelected .wordPickCheck {
  border-color: #1cb0f6;
  background: #1cb0f6;
  color: #fff;
}

.choiceItem.isCorrect,
.choiceItem.isCorrectAnswer {
  border: 2px solid #58cc02;
  background: #d7ffb8;
  box-shadow: none;
}

.choiceItem.isWrong {
  border: 2px solid #ff4b4b;
  background: #ffdfe0;
  box-shadow: none;
}

.choiceKey {
  background: #ddf4ff;
  color: #1cb0f6;
}

.choiceItem.isCorrect .choiceKey,
.choiceItem.isCorrectAnswer .choiceKey {
  background: #58cc02;
  color: #fff;
}

.choiceItem.isWrong .choiceKey,
.choiceResult.wrong {
  background: #ff4b4b;
  color: #fff;
}

.choiceResult {
  background: #58cc02;
  color: #fff;
}

.unitWordKnownButton {
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -4px #46a302;
}

.unitWordKnownButton.isDone {
  background: #e9ffe0;
  color: #46a302;
  border: 2px solid #58cc02;
  border-bottom-width: 3px;
  border-bottom-color: #46a302;
  box-shadow: none;
  font-size: 12px;
}

.unitWordRow.isMastered {
  border-color: #c5f0a8;
  border-bottom-color: #58cc02;
  background: #f7fcf4;
}

.reportActions .bottomButton {
  background: #58cc02;
  color: #fff;
  box-shadow: inset 0 -5px #46a302;
}

.reportScreen .reportSecondaryActions .secondaryButton {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 8px;
  border: 2px solid #84d8ff;
  border-bottom-width: 4px;
  border-radius: 14px;
  background: #fff;
  color: #1cb0f6;
  box-shadow: none;
}

.reportScreen .reportSecondaryActions .secondaryButton.isDisabled {
  border-color: #e5e5e5;
  border-bottom-width: 4px;
  background: #fff;
  color: #c4c4c4;
}

.reportScreen {
  padding-bottom: 24px;
}

.reportScreen .reportActions {
  position: static;
  width: 100%;
  max-width: 100%;
  padding: 0 2px 8px;
  background: transparent;
  box-sizing: border-box;
  transform: none;
}

.dictationPriorityList .emptyState {
  min-height: auto;
  margin-top: 0;
  padding: 12px 14px;
}

.dictationPriorityList .emptyText {
  font-size: 14px;
  line-height: 1.35;
}

.progressFill,
.playerProgressFill {
  background: #58cc02;
}

.scoreNumberBlock {
  background: #ddf4ff;
}
/* #endif */

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

.wordDetailScreen {
  min-height: 100vh;
  min-height: 100dvh;
  margin: calc(-16px - env(safe-area-inset-top)) -18px calc(-26px - env(safe-area-inset-bottom));
  padding: calc(14px + env(safe-area-inset-top)) 20px calc(96px + env(safe-area-inset-bottom));
  background: transparent;
}

.wordDetailNav {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
}

.wordDetailNav .navBack {
  position: static;
  left: auto;
  top: auto;
  flex-shrink: 0;
  transform: none;
}

.wordDetailProgress {
  color: #777;
  font-size: 15px;
  font-weight: 850;
}

.wordDetailScroll {
  padding-top: 8px;
}

.wordDetailHeroCard,
.wordDetailCard {
  margin-bottom: 12px;
  padding: 18px 16px;
  border-radius: 16px;
  background: #fff;
}

.wordDetailWord {
  display: block;
  color: #111;
  font-size: 34px;
  line-height: 1.1;
  font-weight: 950;
}

.wordDetailPhoneticRow {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.wordDetailPhoneticItem {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.wordDetailPhoneticLabel {
  flex: 0 0 auto;
  color: #777;
  font-size: 13px;
  font-weight: 850;
}

.wordDetailPhoneticText {
  flex: 1 1 auto;
  min-width: 0;
  color: #777;
  font-size: 14px;
  font-weight: 750;
}

.wordDetailSpeaker,
.wordDetailExampleSpeaker {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #eef8ff;
}

.wordDetailSpeaker.isPlaying,
.wordDetailExampleSpeaker.isPlaying {
  background: #d4efff;
}

.wordDetailSpeakerIcon {
  width: 14px;
  height: 14px;
  background: #1cb0f6;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E") center / contain no-repeat;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E") center / contain no-repeat;
}

.wordDetailSectionTag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
}

.wordDetailSectionTagText {
  color: #777;
  font-size: 12px;
  font-weight: 850;
}

.wordDetailMeaning {
  display: block;
  margin-top: 12px;
  color: #3c3c3c;
  font-size: 16px;
  line-height: 1.55;
  font-weight: 850;
}

.wordDetailSectionHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.wordDetailSectionBar {
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: #1cb0f6;
}

.wordDetailSectionTitle {
  color: #3c3c3c;
  font-size: 16px;
  font-weight: 950;
}

.wordDetailExampleBody {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.wordDetailExampleCopy {
  flex: 1 1 auto;
  min-width: 0;
}

.wordDetailExampleText {
  color: #3c3c3c;
  font-size: 16px;
  line-height: 1.6;
  font-weight: 850;
}

.wordDetailExampleHighlight {
  color: #111;
  font-weight: 950;
}

.wordDetailExampleTranslation {
  display: block;
  margin-top: 10px;
  color: #777;
  font-size: 14px;
  line-height: 1.55;
  font-weight: 750;
}

.wordDetailFooter {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 6;
  box-sizing: border-box;
  max-width: 430px;
  margin: 0 auto;
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(243, 244, 246, 0) 0%, #f3f4f6 28%);
}

.wordDetailNextButton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-radius: 16px;
  background: #1cb0f6;
  box-shadow: inset 0 -4px #1096e4;
}

.wordDetailNextButton.isDisabled {
  background: #d9dde2;
  box-shadow: inset 0 -4px #c8ccd1;
}

.wordDetailNextLabel {
  color: #fff;
  font-size: 17px;
  font-weight: 950;
}

.wordDetailNextButton.isDisabled .wordDetailNextLabel {
  color: #8a9098;
  font-size: 15px;
}
</style>
