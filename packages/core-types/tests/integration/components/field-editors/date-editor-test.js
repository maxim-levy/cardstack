import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, focus, blur } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import hbs from 'htmlbars-inline-precompile';

const INPUT = '.field-editor > input';

module('Integration | Component | field editors/date editor', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    this.set('model', EmberObject.create({
      expiration: '2030-01-01'
    }));
    this.set('onchange', () => {});
    await render(hbs`
      {{field-editors/date-editor
        content=model
        field="expiration"
        onchange=onchange
      }}`);
    assert.dom(INPUT).hasValue('2030-01-01', 'date input has correct value');
    assert.dom(INPUT).isNotDisabled();
  });

  test('it renders with an invalid date', async function(assert) {
    this.set('model', {
      expiration: 'pizza'
    });
    this.set('onchange', () => {});
    await render(hbs`
      {{field-editors/date-editor
        content=model
        field="expiration"
        onchange=onchange
      }}`);
    assert.dom(INPUT).hasNoValue('date input has no value');
    assert.dom(INPUT).isNotDisabled();
  });

  test('it can be disabled', async function(assert) {
    this.set('model', EmberObject.create({
      expiration: '2030-01-01'
    }));
    this.set('onchange', () => {});
    await render(hbs`
      {{field-editors/date-editor
        content=model
        field="expiration"
        onchange=onchange
        disabled=true
      }}`);
    assert.dom(INPUT).isDisabled();
  });

  test('onchange is called when the field is left', async function(assert) {
    this.set('onchange', () => assert.step('change'))
    this.set('model', EmberObject.create({ rating: 3 }));
    await render(hbs`
      {{field-editors/date-editor
        content=model
        field="rating"
        onchange=onchange
      }}`);
    await focus(INPUT);
    await blur(INPUT);
    assert.verifySteps(['change']);
  });
});
