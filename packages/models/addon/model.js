import DS from 'ember-data';
import RelationshipTracker from "ember-data-relationship-tracker";
import { inject as service } from '@ember/service';
import { computed, defineProperty, get } from '@ember/object';
import { readOnly, or } from '@ember/object/computed';
import { capitalize } from '@ember/string';
import { run } from '@ember/runloop';
import { A as EmberArray } from '@ember/array';
import { uniq } from 'lodash-es';

export default DS.Model.extend(RelationshipTracker, {
  resourceMetadata: service(),

  init() {
    this._super();
    let ownedRelationships = {};
    this._relationshipsByName().forEach((relation) => {
      let { kind, meta } = relation;
      if (meta) {
        let { owned } = meta.options;
        if (owned) {
          //TODO: Create a _ownedRelationships hash:
          // { comments: 'hasMany', author: 'belongsTo' }
          // that hash can then be used for creating the dirtyTracking CPs
          // but also when saving and rendering fields for owner records
          //TODO: Implement relatedOwnedRecords
          //TODO: Refactor `saveRelated` to use `relatedOwnedRecords`
          ownedRelationships[meta.name] = kind;
        }
      }
    });

    if (Object.keys(ownedRelationships).length > 0) {
      this._createDirtyTrackingCPs(ownedRelationships);
    }
    this.set('ownedRelationships', ownedRelationships);
  },

  relationshipTrackerVersion: computed(function() {
    let meta = this.get('resourceMetadata').read(this);
    return meta && meta.version;
  }),

  async save() {
    // this._super is not safe to use asynchronously
    // see https://github.com/ember-cli/ember-cli/issues/6282
    let modelSave = this._super.bind(this);
    run(async () => {
      await this.saveRelated();
    });
    await modelSave(...arguments);
  },

  async saveRelated() {
    let relatedSaves = Object.keys(this.ownedRelationships).map((relationName) => {
      let isRelationDirty = this.dirtyTrackingRelationNames[relationName];
      if (isRelationDirty) {
        let relatedRecords = relatedRecordsFor(this, relationName);
        let dirtyRecords = relatedRecords.filter(record => record.hasDirtyFields);
        return EmberArray(dirtyRecords).invoke('save');
      }
    });
    return Promise.all(flatten(relatedSaves));
  },

  relatedOwnedRecords() {
    return uniq(relatedOwnedRecords([ this ]));
  },

  _createDirtyTrackingCPs(ownedRelationships) {
    let dirtyTrackingProperties = {};
    for (let relationshipName in ownedRelationships) {
      let kind = ownedRelationships[relationshipName];
      let propertyName = createHasDirtyForRelationship(this, relationshipName, kind);
      dirtyTrackingProperties[relationshipName] = propertyName;
    }
    createHasDirtyOwned(this, Object.values(dirtyTrackingProperties));
    this.set('dirtyTrackingRelationNames', dirtyTrackingProperties);
  },

  _relationshipsByName() {
    return get(this.constructor, 'relationshipsByName');
  }
});

function relatedOwnedRecords(models, records=[]) {
  if (models.length === 0) {
    return records;
  }
  let [ model, ...remainingModels ] = models;
  Object.keys(model.ownedRelationships).map((relationName) => {
    let relatedRecords = relatedRecordsFor(model, relationName);
    records = records.concat(relatedRecords);
    remainingModels = remainingModels.concat(relatedRecords);
  });
  return relatedOwnedRecords(remainingModels, records);
}

function relatedRecordsFor(model, relationName) {
  let kind = model.ownedRelationships[relationName];
  let related = model.get(relationName);
  return kind === 'hasMany' ? related.toArray() : [ related ];
}

function createHasDirtyForRelationship(model, name, kind) {
  let propertyName = `hasDirty${capitalize(name)}`;
  if (kind === 'hasMany') {
    defineProperty(model, propertyName, computed(`${name}.@each.hasDirtyAttributes`, function() {
      return model.get(name).toArray().some((related) => related.hasDirtyAttributes);
    }));
  } else {
    defineProperty(model, propertyName, readOnly(`${name}.hasDirtyAttributes`));
  }
  return propertyName;
}

function createHasDirtyOwned(model, properties) {
  defineProperty(model, 'hasDirtyOwned', or(properties.join(',')));
}

function flatten(arrays) {
  return arrays.reduce((flattened, array) => {
    return flattened.concat(array);
  }, []);
}
