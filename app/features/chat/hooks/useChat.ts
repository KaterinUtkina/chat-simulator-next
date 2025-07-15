import { useCallback, useEffect, useState } from "react";
import { useLoading } from "@/app/features/chat/hooks/useLoading";
import questionsMock from "@/app/config/questions.json";
import { AnswerRequest, QuestionTemplate } from "@/app/features/chat/types";

export function useChat() {
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const {
    loading: answerLoading,
    startLoading: startAnswerLoading,
    stopLoading: stopAnswerLoading,
  } = useLoading();
  const {
    loading: questionLoading,
    startLoading: startQuestionLoading,
    stopLoading: stopQuestionLoading,
  } = useLoading();
  const [activeAnswerIndex, setActiveAnswerIndex] = useState(0);
  const [optionsQuestion, setOptionsQuestions] = useState<string[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const getQuestionHandler = useCallback((questionsList = questions) => {
    setTimeout(() => {
      setActiveAnswerIndex(0);
      stopQuestionLoading();

      const newQuestions = [
        ...questionsList,
        {
          id: questionsMock[questionsList.length].id,
          text: questionsMock[questionsList.length].text,
          answer: [],
        },
      ];

      setQuestions(newQuestions);
      setOptionsQuestions(questionsMock[questionsList.length].options as string[]);
      setActiveQuestionId(questionsMock[questionsList.length].id);
    }, 500);
  }, []);

  const createOrUpdateAnswers = useCallback(
    (params: AnswerRequest, index: number) => {
      const newAnswers = {
        options: params.options,
        answer: [params.freeAnswer],
        audio: params.audio,
        warning: false,
      };

      return questions.map((item) => {
        if (item.id === params.questionId) {
          const answers = [...item.answer];
          answers[index] = newAnswers;

          return {
            ...item,
            answer: answers,
          };
        }

        return item;
      });
    },
    [questions],
  );

  const sendAnswerAndGetQuestion = useCallback(
    async (params: AnswerRequest, questionsList: QuestionTemplate[], answerIndex: number) => {
      try {
        await sendAnswer();

        stopAnswerLoading();
        resetQuestions();

        if (!questionsMock[questionsList.length]) return;

        startQuestionLoading();

        void getQuestionHandler(questionsList);
      } catch {
        stopAnswerLoading();

        const warningQuestions = questionsList.map((item) => {
          if (item.id === params.questionId) {
            return {
              ...item,
              answer: item.answer.map((itemAnswer, index) => {
                if (answerIndex === index) {
                  return {
                    ...itemAnswer,
                    warning: true,
                  };
                }
                return itemAnswer;
              }),
            };
          }

          return item;
        });

        setQuestions(warningQuestions);
      }
    },
    [getQuestionHandler, startQuestionLoading, stopAnswerLoading],
  );

  const reloadAnswer = useCallback(
    (index: number) => {
      if (answerLoading || questionLoading) {
        return;
      }

      startAnswerLoading();

      const updateAnswer = questions.find((item) => item.id === activeQuestionId)?.answer[index];

      if (!updateAnswer || !activeQuestionId) return;

      const params = {
        questionId: activeQuestionId,
        freeAnswer: updateAnswer.answer[0],
        options: updateAnswer.options,
        audio: updateAnswer.audio,
      };

      const newQuestions = createOrUpdateAnswers(params, index);
      setQuestions(newQuestions);

      void sendAnswerAndGetQuestion(params, newQuestions, index);
    },
    [
      answerLoading,
      questionLoading,
      questions,
      activeQuestionId,
      startAnswerLoading,
      createOrUpdateAnswers,
      sendAnswerAndGetQuestion,
    ],
  );

  const sendAnswer = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.7) {
          resolve(true);
        } else {
          reject();
        }
      }, 500);
    });
  };

  useEffect(() => {
    void getQuestionHandler();
  }, [getQuestionHandler]);

  const sendAnswerHandler = useCallback(
    async (params: { freeAnswer: string; options: string[]; audio: HTMLAudioElement | null }) => {
      if (answerLoading || questionLoading || !activeQuestionId) return;

      const answerIndex = activeAnswerIndex;
      setActiveAnswerIndex((index) => index + 1);
      startAnswerLoading();

      const newQuestions = createOrUpdateAnswers(
        { ...params, questionId: activeQuestionId },
        answerIndex,
      );
      setQuestions(newQuestions);

      void sendAnswerAndGetQuestion(
        { ...params, questionId: activeQuestionId },
        newQuestions,
        answerIndex,
      );
    },
    [
      answerLoading,
      questionLoading,
      activeQuestionId,
      activeAnswerIndex,
      startAnswerLoading,
      createOrUpdateAnswers,
      sendAnswerAndGetQuestion,
    ],
  );

  const resetQuestions = () => {
    setOptionsQuestions([]);
  };

  useEffect(() => {
    checkTouchDevice();
  }, []);

  const checkTouchDevice = () => {
    setIsTouchDevice(navigator.maxTouchPoints > 0);
  };

  return {
    questions,
    questionLoading,
    answerLoading,
    activeQuestionId,
    reloadAnswer,
    activeAnswerIndex,
    sendAnswerHandler,
    optionsQuestion,
    isTouchDevice,
  };
}
