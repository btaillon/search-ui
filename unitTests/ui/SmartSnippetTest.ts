import { IQuestionAnswerResponse } from '../../src/rest/QuestionAnswerResponse';
import { IQueryResult } from '../../src/rest/QueryResult';
import { $$ } from '../../src/utils/Dom';
import { QueryEvents, IQuerySuccessEventArgs } from '../../src/events/QueryEvents';
import { SmartSnippet, SmartSnippetClassNames as ClassNames } from '../../src/ui/SmartSnippet/SmartSnippet';
import { expectChildren } from '../TestUtils';
import { UserFeedbackBannerClassNames } from '../../src/ui/SmartSnippet/UserFeedbackBanner';
import { IBasicComponentSetup, advancedComponentSetup, AdvancedComponentSetupOptions } from '../MockEnvironment';
import { HeightLimiterClassNames } from '../../src/ui/SmartSnippet/HeightLimiter';
import { analyticsActionCauseList } from '../../src/ui/Analytics/AnalyticsActionListMeta';

function simulateClick(element: HTMLElement) {
  element.dispatchEvent(new MouseEvent('click', { ctrlKey: true }));
}

function expectCallWith(funct: jasmine.Spy, ...params: any[]) {
  const lastCall = funct.calls.mostRecent();
  expect(lastCall).not.toBeNull();
  if (!lastCall) {
    return;
  }
  const lastCallArguments = lastCall.args;
  params.forEach((value, i) => expect(lastCallArguments[i]).toEqual(value));
}

export function SmartSnippetTest() {
  const sourceTitle = 'Google!';
  const sourceUrl = 'https://www.google.com/';
  const sourceId: IQuestionAnswerResponse['documentId'] = {
    contentIdKey: 'unique-identifier',
    contentIdValue: 'identifier-of-the-first-result'
  };
  const style = `
    .abc {
      color: red;
    }

    #hello-world {
      cursor: url('some-ugly-animated-gif-cursor.gif');
    }
  `.replace(' ', '');

  function mockResult() {
    return (<Partial<IQueryResult>>{
      title: sourceTitle,
      clickUri: sourceUrl,
      raw: {
        [sourceId.contentIdKey]: sourceId.contentIdValue
      }
    }) as IQueryResult;
  }

  function mockSnippet() {
    return $$(
      'main',
      {
        className: 'abc'
      },
      $$(
        'header',
        {
          className: 'def--abc'
        },
        $$('span', {}, 'Some text here')
      ),
      $$('span', {}, 'Some more text'),
      $$(
        'a',
        {
          href: 'https://somewebsite.com'
        },
        'Some external link'
      )
    ).el;
  }

  function mockStyling() {
    return $$('script', { type: 'text/css' }, style).el;
  }

  function mockQuestionAnswer() {
    return <IQuestionAnswerResponse>{
      answerSnippet: mockSnippet().innerHTML,
      documentId: sourceId
    };
  }

  describe('SmartSnippet', () => {
    let test: IBasicComponentSetup<SmartSnippet>;

    function instantiateSmartSnippet(hasStyling: boolean) {
      test = advancedComponentSetup<SmartSnippet>(
        SmartSnippet,
        new AdvancedComponentSetupOptions($$('div', {}, ...(hasStyling ? [mockStyling()] : [])).el)
      );
    }

    function triggerQuerySuccess(withSource: boolean) {
      const results = withSource ? [mockResult()] : [];
      (test.env.queryController.getLastResults as jasmine.Spy).and.returnValue({ results });
      $$(test.env.root).trigger(QueryEvents.querySuccess, <IQuerySuccessEventArgs>{
        results: {
          results,
          questionAnswer: mockQuestionAnswer()
        }
      });
    }

    function getFirstChild(className: string) {
      return test.cmp.element.getElementsByClassName(className)[0] as HTMLElement;
    }

    function getShadowRoot() {
      return getFirstChild(ClassNames.SHADOW_CLASSNAME).shadowRoot;
    }

    describe('with styling without a source', () => {
      beforeEach(() => {
        instantiateSmartSnippet(true);
        triggerQuerySuccess(false);
      });

      it('should render the style', () => {
        const styleElement = getShadowRoot().querySelector('style') as HTMLStyleElement;
        expect(styleElement.innerHTML).toEqual(style);
      });
    });

    describe('without styling', () => {
      beforeEach(() => {
        instantiateSmartSnippet(false);
      });

      it("doesn't have the has-answer class", () => {
        expect(test.cmp.element.classList.contains(ClassNames.HAS_ANSWER_CLASSNAME)).toBeFalsy();
      });

      it("doesn't render anything in the SmartSnippet element", () => {
        expect(test.cmp.element.children.length).toEqual(0);
      });

      describe('with a source', () => {
        beforeEach(() => {
          triggerQuerySuccess(true);
        });

        it('has the has-answer class', () => {
          expect(test.cmp.element.classList.contains(ClassNames.HAS_ANSWER_CLASSNAME)).toBeTruthy();
        });

        it('should render the source with its url first then its title', () => {
          const [url, title] = expectChildren(getFirstChild(ClassNames.SOURCE_CLASSNAME), [
            ClassNames.SOURCE_URL_CLASSNAME,
            ClassNames.SOURCE_TITLE_CLASSNAME
          ]) as HTMLAnchorElement[];

          expect(url.href).toEqual(sourceUrl);
          expect(url.innerText).toEqual(sourceUrl);

          expect(title.href).toEqual(sourceUrl);
          expect(title.innerText).toEqual(sourceTitle);
        });

        it('should log analytics when clicking on the source URL', () => {
          spyOn(window, 'open');

          simulateClick(getFirstChild(ClassNames.SOURCE_URL_CLASSNAME));
          expectCallWith(test.env.usageAnalytics.logCustomEvent as jasmine.Spy, analyticsActionCauseList.openSmartSnippetSource);
        });

        it('should log analytics when clicking on the title', () => {
          spyOn(window, 'open');

          simulateClick(getFirstChild(ClassNames.SOURCE_TITLE_CLASSNAME));
          expectCallWith(test.env.usageAnalytics.logCustomEvent as jasmine.Spy, analyticsActionCauseList.openSmartSnippetSource);
        });

        it('should open a new tab when clicking on the source', () => {
          const open = spyOn(window, 'open');

          simulateClick(getFirstChild(ClassNames.SOURCE_URL_CLASSNAME));
          expect(open).toHaveBeenCalledWith(sourceUrl);
        });

        it('should open a new tab when clicking on the title', () => {
          const open = spyOn(window, 'open');

          simulateClick(getFirstChild(ClassNames.SOURCE_TITLE_CLASSNAME));
          expect(open).toHaveBeenCalledWith(sourceUrl);
        });
      });

      describe('without a source', () => {
        beforeEach(() => {
          triggerQuerySuccess(false);
        });

        it('should render the answer container followed by the feedback banner', () => {
          expectChildren(test.cmp.element, [ClassNames.ANSWER_CONTAINER_CLASSNAME, UserFeedbackBannerClassNames.ROOT_CLASSNAME]);
        });

        it('should render the snippet followed by the source in the answer container', () => {
          expectChildren(getFirstChild(ClassNames.ANSWER_CONTAINER_CLASSNAME), [
            ClassNames.SHADOW_CLASSNAME,
            HeightLimiterClassNames.BUTTON_CLASSNAME,
            ClassNames.SOURCE_CLASSNAME
          ]);
        });

        it('should wrap the snippet in a container in a shadow DOM', () => {
          const [shadowContainer] = expectChildren(getShadowRoot(), [ClassNames.CONTENT_CLASSNAME]);

          expect(shadowContainer.innerHTML).toEqual(mockSnippet().innerHTML);
        });

        it('should not render any source', () => {
          expect(getFirstChild(ClassNames.SOURCE_CLASSNAME).children.length).toEqual(0);
        });
      });
    });
  });
}